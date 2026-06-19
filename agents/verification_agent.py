# agents/verification_agent.py
import os
import re
import sys
import json
import math
import httpx
import asyncio

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from band import Agent, Emit, PlatformMessage
from band.core.simple_adapter import SimpleAdapter

# Load environment variables
load_dotenv()

# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Configure Gemini API
gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Radius of the Earth in meters
    R = 6371000.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
        
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class VerificationAdapter(SimpleAdapter[list]):
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
        if msg.sender_type == "Agent" and msg.sender_id == os.environ.get("BAND_VERIFICATION_AGENT_ID"):
            return

        # Only process if this is an explicit resolution request
        if "requested resolution" not in msg.content:
            return

        print(f"[Verification Agent] Received message: {msg.content}")

        # Extract Grievance ID
        match = re.search(r'GRV-2026-[A-Z0-9]{8}', msg.content)
        if not match:
            return

        grievance_id = match.group(0)
        print(f"[Verification Agent] Verifying resolution for ID: {grievance_id}")

        await tools.send_event(
            content=f"Starting resolution lock checks for {grievance_id}...",
            message_type="thought"
        )

        try:
            # 1. Fetch grievance details
            db_res = supabase.table("grievances").select("*").eq("grievance_id", grievance_id).single().execute()
            complaint = db_res.data
            if not complaint:
                print(f"[Verification Agent] Grievance {grievance_id} not found in database.")
                return

            original_lat = float(complaint.get("latitude"))
            original_lng = float(complaint.get("longitude"))
            admin_lat = complaint.get("resolution_lat")
            admin_lng = complaint.get("resolution_lng")
            after_image_url = complaint.get("after_image_url")
            description = complaint.get("description")

            if admin_lat is None or admin_lng is None or not after_image_url:
                routing_agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
                await tools.send_message(
                    content=f"Error: Missing after-photo or admin GPS coordinates for {grievance_id}.",
                    mentions=[{"id": routing_agent_id}] if routing_agent_id else None
                )
                return

            admin_lat = float(admin_lat)
            admin_lng = float(admin_lng)

            # 2. Check 1: Haversine distance
            distance = haversine_distance(original_lat, original_lng, admin_lat, admin_lng)
            print(f"[Verification Agent] Distance check: {distance:.2f} meters.")

            if distance > 100.0:
                reason = f"Verification failed. Admin location is {distance:.1f} meters away from the complaint site (must be within 100m)."
                
                # Log resolution failure
                supabase.table("grievance_history").insert({
                    "grievance_id": complaint["id"],
                    "event": "RESOLUTION_FAILED",
                    "actor": "VERIFICATION_AGENT",
                    "metadata": {"reason": reason, "distance": distance}
                }).execute()

                # Rollback status to IN_PROGRESS if resolved was set temporarily, or keep current
                # Note: Next.js API polls for RESOLUTION_FAILED, so logging this event is critical
                await tools.send_message(
                    content=f"❌ Resolution Rejected for {grievance_id}.\nReason: {reason}"
                )
                return

            # 3. Check 2: Gemini Vision verification of the after-photo
            # Download the after photo
            async with httpx.AsyncClient() as client:
                img_resp = await client.get(after_image_url)
                if img_resp.status_code != 200:
                    raise Exception(f"Failed to download after-photo from {after_image_url}")
                image_bytes = img_resp.content

            # Invoke Gemini Vision Model
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""You are a civic infrastructure resolution validator.
Analyze this after-photo showing the repaired site and confirm if the original infrastructure issue appears to be successfully resolved/repaired/cleaned up.
Respond ONLY with valid JSON:
{{
  "isResolved": boolean,
  "confidence": 0.0-1.0,
  "reason": "one sentence explanation"
}}

Original Complaint Details:
- Category: {complaint.get('category')}
- Description: {description}"""

            response = await asyncio.to_thread(
                model.generate_content,
                [
                    {"mime_type": "image/jpeg", "data": image_bytes},
                    prompt
                ]
            )

            # Parse response
            result = {"isResolved": False, "confidence": 0.0, "reason": "Failed to analyze image."}
            try:
                response_text = response.text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                response_text = response_text.strip()
                result = json.loads(response_text)
            except Exception as parse_err:
                print(f"[Verification Agent] Parsing error: {parse_err}. Raw: {response.text}")
                result["reason"] = f"Failed to parse Gemini output: {str(parse_err)}"

            is_resolved = result.get("isResolved", False)
            confidence = float(result.get("confidence", 0.0))
            reason = result.get("reason", "No verification details provided.")

            if not is_resolved or confidence < 0.6:
                # REJECT resolution
                reason_msg = f"After-photo check failed. Reason: {reason}"
                
                # Log history
                supabase.table("grievance_history").insert({
                    "grievance_id": complaint["id"],
                    "event": "RESOLUTION_FAILED",
                    "actor": "VERIFICATION_AGENT",
                    "metadata": {"reason": reason_msg, "confidence": confidence}
                }).execute()

                routing_agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
                await tools.send_message(
                    content=f"❌ Resolution Rejected for {grievance_id}.\nReason: {reason_msg}\n@routing_agent Please review.",
                    mentions=[{"id": routing_agent_id}] if routing_agent_id else None
                )
            else:
                # RESOLUTION SUCCESS! BOTH checks pass
                now_str = datetime.now(timezone.utc).isoformat()
                
                # Update grievance status to RESOLVED
                supabase.table("grievances").update({
                    "status": "RESOLVED",
                    "location_verified": True,
                    "resolved_at": now_str
                }).eq("id", complaint["id"]).execute()

                # Log history
                supabase.table("grievance_history").insert({
                    "grievance_id": complaint["id"],
                    "event": "RESOLVED",
                    "actor": "VERIFICATION_AGENT",
                    "metadata": {
                        "distance_meters": distance,
                        "confidence": confidence,
                        "reason": reason,
                        "resolved_at": now_str
                    }
                }).execute()

                routing_agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
                await tools.send_message(
                    content=f"🎉 Resolution VERIFIED for {grievance_id}.\nGPS Check Passed ({distance:.1f}m away).\nAI Vision verification passed: {reason}.\n@routing_agent Grievance is now closed.",
                    mentions=[{"id": routing_agent_id}] if routing_agent_id else None
                )

        except Exception as err:
            print(f"[Verification Agent] Error verifying grievance {grievance_id}: {err}")
            await tools.send_event(
                content=f"Error verifying resolution for {grievance_id}: {str(err)}",
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
    agent_id = os.environ.get("BAND_VERIFICATION_AGENT_ID")
    api_key = os.environ.get("BAND_VERIFICATION_API_KEY")
    if not agent_id or not api_key:
        print("[Verification Agent] Missing credentials. Skipping start.")
        return

    print("[Verification Agent] Initializing...")
    agent = Agent.create(
        adapter=VerificationAdapter(),
        agent_id=agent_id,
        api_key=api_key
    )
    async with agent:
        asyncio.create_task(send_heartbeat("verification_agent", supabase))
        await agent.run_forever()

if __name__ == "__main__":
    asyncio.run(main())
