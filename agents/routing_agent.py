# agents/routing_agent.py
import os
import re
import sys
import asyncio
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from supabase import create_client, Client
from band import Agent, Emit, PlatformMessage
from band.core.simple_adapter import SimpleAdapter

# Load environment variables
load_dotenv()

# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Category to Department Mappings
DEPT_MAPPINGS = {
    'Roads': ('PWD', 'Public Works Department'),
    'Water Supply': ('JAL_SHAKTI', 'Jal Shakti'),
    'Electricity': ('DISCOM', 'DISCOM'),
    'Others': ('GENERAL', 'General Administration')
}

# SLA Deadlines in Hours
SLA_HOURS = {
    'Water Supply': 24,
    'Electricity': 48,
    'Roads': 72,
    'Others': 96
}

class RoutingAdapter(SimpleAdapter[list]):
    SUPPORTED_EMIT = frozenset({Emit.EXECUTION})
    
    async def on_message(
        self,
        msg: PlatformMessage,
        tools,
        history,
        participants_msg,
        contacts_msg,
        *,
        is_session_bootstrap,
        room_id,
    ) -> None:
        # Avoid processing own messages
        if msg.sender_type == "Agent" and msg.sender_id == os.environ.get("BAND_ROUTING_AGENT_ID"):
            return

        print(f"[Routing Agent] Received message: {msg.content}")

        # Extract Grievance ID
        match = re.search(r'GRV-2026-[A-Z0-9]{8}', msg.content)
        if not match:
            return

        grievance_id = match.group(0)
        print(f"[Routing Agent] Routing Grievance ID: {grievance_id}")

        await tools.send_event(
            content=f"Routing grievance {grievance_id} to proper department and calculating SLA...",
            message_type="thought"
        )

        try:
            # 1. Fetch complaint AI category & severity from Supabase
            db_res = supabase.table("grievances").select("*").eq("grievance_id", grievance_id).single().execute()
            complaint = db_res.data
            if not complaint:
                print(f"[Routing Agent] Grievance {grievance_id} not found in database.")
                return

            if complaint.get("status") != "AI_VERIFIED":
                print(f"[Routing Agent] Grievance {grievance_id} status is {complaint.get('status')}. Skipping routing.")
                return

            # Use ai_category and ai_severity if verified, fallback to citizen inputs
            category = complaint.get("ai_category") or complaint.get("category")
            severity = complaint.get("ai_severity") or "Low"

            # 2. Map Category to Department
            dept_id, dept_name = DEPT_MAPPINGS.get(category, ('GENERAL', 'General Administration'))

            # 3. Calculate SLA hours
            sla_hours = SLA_HOURS.get(category, 96)
            
            # Cut deadline by 50% if severity is High
            if severity == 'High':
                sla_hours = sla_hours * 0.5

            # Calculate deadline datetime (in UTC ISO format)
            deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)
            deadline_str = deadline.isoformat()

            # 4. Update Supabase
            supabase.table("grievances").update({
                "status": "ROUTED",
                "department_id": dept_id,
                "department_name": dept_name,
                "deadline": deadline_str
            }).eq("id", complaint["id"]).execute()

            # 5. Log history
            supabase.table("grievance_history").insert({
                "grievance_id": complaint["id"],
                "event": "ROUTED",
                "actor": "ROUTING_AGENT",
                "metadata": {
                    "department_id": dept_id,
                    "department_name": dept_name,
                    "sla_hours": sla_hours,
                    "deadline": deadline_str
                }
            }).execute()

            # 6. Post update message to Band room
            verification_agent_id = os.environ.get("BAND_VERIFICATION_AGENT_ID")
            await tools.send_message(
                content=f"⚙️ Complaint {grievance_id} has been ROUTED to {dept_name}.\nSLA Resolution Target: {sla_hours} hours (Deadline: {deadline.strftime('%Y-%m-%d %H:%M:%S UTC')}).\n@verification_agent Please monitor this for resolution.",
                mentions=[{"id": verification_agent_id}] if verification_agent_id else None
            )

        except Exception as err:
            print(f"[Routing Agent] Error routing grievance {grievance_id}: {err}")
            await tools.send_event(
                content=f"Error routing grievance {grievance_id}: {str(err)}",
                message_type="error"
            )

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
    agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
    api_key = os.environ.get("BAND_ROUTING_API_KEY")
    if not agent_id or not api_key:
        print("[Routing Agent] Missing credentials. Skipping start.")
        return

    print("[Routing Agent] Initializing...")
    agent = Agent.create(
        adapter=RoutingAdapter(),
        agent_id=agent_id,
        api_key=api_key
    )
    async with agent:
        asyncio.create_task(send_heartbeat("routing_agent", supabase))
        await agent.run_forever()

if __name__ == "__main__":
    asyncio.run(main())
