# agents/watchdog_agent.py
import os
import sys
import asyncio
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from supabase import create_client, Client
from band import Agent
from thenvoi_rest import RestClient

# Load environment variables
load_dotenv()

# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Band REST Client
band_api_url = os.environ.get("BAND_API_BASE_URL") or "https://app.band.ai"
watchdog_api_key = os.environ.get("BAND_WATCHDOG_API_KEY")
band_client = RestClient(api_key=watchdog_api_key, base_url=band_api_url) if watchdog_api_key else None

async def check_overdue_tickets():
    print(f"[Watchdog Agent] Running schedule check at {datetime.now(timezone.utc)}")
    try:
        # 1. Query Supabase for routed or in_progress tickets where deadline is passed
        now_str = datetime.now(timezone.utc).isoformat()
        
        # Query matching the WATCHDOG queries in SCHEMA:
        # WHERE status IN ('ROUTED', 'IN_PROGRESS') AND deadline < NOW()
        db_res = supabase.table("grievances") \
            .select("*") \
            .in_("status", ["ROUTED", "IN_PROGRESS", "ESCALATED"]) \
            .lt("deadline", now_str) \
            .execute()

        overdue_tickets = db_res.data or []
        print(f"[Watchdog Agent] Found {len(overdue_tickets)} overdue tickets.")

        for ticket in overdue_tickets:
            # Skip if already escalated and level >= 2 (max escalation level reached)
            # Level 0 -> Level 1 (Supervisor), Level 1 -> Level 2 (Critical)
            current_level = ticket.get("escalation_level", 0)
            if current_level >= 2:
                continue

            new_level = current_level + 1
            grievance_id = ticket["grievance_id"]
            row_id = ticket["id"]

            print(f"[Watchdog Agent] Escalating complaint {grievance_id} to level {new_level}.")

            # 2. Update status and escalation level in Supabase
            supabase.table("grievances").update({
                "status": "ESCALATED",
                "escalation_level": new_level,
                "is_high_priority": True
            }).eq("id", row_id).execute()

            # 3. Log event in history
            supabase.table("grievance_history").insert({
                "grievance_id": row_id,
                "event": "ESCALATED",
                "actor": "WATCHDOG_AGENT",
                "metadata": {"escalation_level": new_level, "time_checked": now_str}
            }).execute()

            # 4. Post alert message in the Band Room
            if band_client:
                # Find matching chat room for this grievance
                target_room_id = None
                try:
                    chats_res = band_client.agent_api_chats.list_agent_chats()
                    rooms = chats_res.data or []
                    match_room = next((r for r in rooms if r.title and grievance_id in r.title), None)
                    if match_room:
                        target_room_id = match_room.id
                except Exception as chat_err:
                    print(f"[Watchdog Agent] Error listing chats: {chat_err}")

                if target_room_id:
                    alert_msg = f"⚠️ ALERT: Complaint {grievance_id} is OVERDUE!\nEscalation Level {new_level} reached.\nDepartment: {ticket.get('department_name')}\nisHighPriority: TRUE. Move to the top of the queue!"
                    try:
                        from thenvoi_rest import ChatMessageRequest
                        band_client.agent_api_messages.create_agent_chat_message(
                            chat_id=target_room_id,
                            message=ChatMessageRequest(content=alert_msg)
                        )
                        print(f"[Watchdog Agent] Alert posted to room {target_room_id} for {grievance_id}")
                    except Exception as post_err:
                        print(f"[Watchdog Agent] Error posting alert: {post_err}")
                else:
                    print(f"[Watchdog Agent] No Band room found for {grievance_id} to post alert.")

    except Exception as err:
        print(f"[Watchdog Agent] Error in checker loop: {err}")

async def send_heartbeat(agent_name: str, supabase_client):
    while True:
        try:
            supabase_client.table('agent_status').upsert({
                'agent_name': agent_name,
                'last_seen': datetime.now(timezone.utc).isoformat(),
                'status': 'online'
            }, on_conflict='agent_name').execute()
        except Exception as e:
            print(f"[{agent_name}] Heartbeat failed: {e}")
        await asyncio.sleep(60)

async def main():
    # Since Watchdog runs on a schedule (every 5 minutes), we can run it as a polling task
    # It does not need to connect as a WebSocket agent listening to messages, 
    # but we can optionally initialize it as a Band Agent to authenticate or run it standalone.
    # We run it standalone with an infinite async loop.
    print("[Watchdog Agent] Watchdog Scheduler Starting...")
    asyncio.create_task(send_heartbeat("watchdog_agent", supabase))
    while True:
        await check_overdue_tickets()
        # Sleep for 5 minutes (300 seconds)
        await asyncio.sleep(300)

if __name__ == "__main__":
    asyncio.run(main())
