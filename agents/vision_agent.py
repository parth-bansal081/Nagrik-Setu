# agents/vision_agent.py
import os
import re
import sys
import json
import httpx
import asyncio
from datetime import datetime, timezone
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from band import Agent, Emit, Capability, PlatformMessage
from band.core.simple_adapter import SimpleAdapter

# Load environment variables
load_dotenv()

# Initialize Supabase Client (bypassing RLS with service role key)
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Configure Gemini API
gemini_key = os.environ.get("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("Missing GEMINI_API_KEY")
genai.configure(api_key=gemini_key)

class VisionValidatorAdapter(SimpleAdapter[list]):
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
        # Avoid processing own messages or events
        if msg.sender_type == "Agent" and msg.sender_id == os.environ.get("BAND_VISION_AGENT_ID"):
            return

        print(f"[Vision Agent] Received message: {msg.content}")

        # Extract Grievance ID from the message (format: GRV-2026-XXXXXXXX)
        match = re.search(r'GRV-2026-[A-Z0-9]{8}', msg.content)
        if not match:
            return

        grievance_id = match.group(0)
        print(f"[Vision Agent] Extracting Grievance ID: {grievance_id}")

        # Send processing event to room
        await tools.send_event(
            content=f"Analyzing photo evidence for complaint {grievance_id}...",
            message_type="thought"
        )

        try:
            # 1. Fetch complaint details from Supabase
            db_res = supabase.table("grievances").select("*").eq("grievance_id", grievance_id).single().execute()
            complaint = db_res.data
            if not complaint:
                print(f"[Vision Agent] Grievance {grievance_id} not found in database.")
                return

            image_url = complaint.get("image_url")
            description = complaint.get("description")
            category = complaint.get("category")

            if not image_url:
                await tools.send_message(f"Error: No image URL associated with complaint {grievance_id}.")
                return

            # 2. Download the image bytes
            async with httpx.AsyncClient() as client:
                img_resp = await client.get(image_url)
                if img_resp.status_code != 200:
                    raise Exception(f"Failed to download image from {image_url}")
                image_bytes = img_resp.content

            # 3. Invoke Gemini Vision Model
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""You are a civic infrastructure validator.
Analyze this image and respond ONLY with valid JSON:
{{
  "isValidInfrastructure": boolean,
  "category": "Roads" | "Water Supply" | "Electricity" | "Others" | null,
  "severity": "Low" | "Medium" | "High" | null,
  "confidence": 0.0-1.0,
  "summary": "one sentence description"
}}

Rules:
- isValidInfrastructure must be true only if image shows a real outdoor civic issue (like potholes, broken pipes, live wires, street leaks, debris)
- Reject selfies, memes, screenshots, indoor photos, random animals, or clean streets.
- severity High = immediate danger to public (deep pothole in middle of highway, burst water main causing flooding, live wire dangling on street)
- Use description as supporting context: "{description}" (Note: originally categorized by citizen as "{category}")"""

            response = await asyncio.to_thread(
                model.generate_content,
                [
                    {"mime_type": "image/jpeg", "data": image_bytes},
                    prompt
                ]
            )

            # 4. Parse response defensively
            result = {"isValidInfrastructure": False, "confidence": 0.0, "category": None, "severity": None, "summary": "Failed to analyze image."}
            try:
                response_text = response.text.strip()
                # Clean markdown blocks if returned
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                response_text = response_text.strip()
                result = json.loads(response_text)
            except Exception as parse_err:
                print(f"[Vision Agent] Parsing error: {parse_err}. Raw response: {response.text}")
                result["summary"] = f"Failed to parse Gemini output: {str(parse_err)}"

            # 5. Process validation results
            is_valid = result.get("isValidInfrastructure", False)
            confidence = float(result.get("confidence", 0.0))

            if not is_valid or confidence < 0.6:
                # REJECT complaint
                reason = result.get("summary", "Image does not show a valid outdoor infrastructure grievance.")
                
                # Update Supabase status
                supabase.table("grievances").update({
                    "status": "REJECTED",
                    "ai_category": result.get("category"),
                    "ai_severity": result.get("severity"),
                    "ai_confidence": confidence,
                    "ai_summary": reason
                }).eq("id", complaint["id"]).execute()

                # Log history
                supabase.table("grievance_history").insert({
                    "grievance_id": complaint["id"],
                    "event": "REJECTED",
                    "actor": "VISION_AGENT",
                    "metadata": {"reason": reason, "confidence": confidence}
                }).execute()

                # Post update in Band room
                routing_agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
                await tools.send_message(
                    content=f"❌ Complaint {grievance_id} REJECTED by AI Validator. Reason: {reason}\n@routing_agent No further action needed.",
                    mentions=[{"id": routing_agent_id}] if routing_agent_id else None
                )
            else:
                # VALID complaint
                ai_category = result.get("category") or category
                ai_severity = result.get("severity") or "Low"
                ai_summary = result.get("summary", "Valid infrastructure issue detected.")

                # Update Supabase status
                supabase.table("grievances").update({
                    "status": "AI_VERIFIED",
                    "ai_category": ai_category,
                    "ai_severity": ai_severity,
                    "ai_confidence": confidence,
                    "ai_summary": ai_summary
                }).eq("id", complaint["id"]).execute()

                # Log history
                supabase.table("grievance_history").insert({
                    "grievance_id": complaint["id"],
                    "event": "AI_VERIFIED",
                    "actor": "VISION_AGENT",
                    "metadata": {
                        "category": ai_category,
                        "severity": ai_severity,
                        "confidence": confidence,
                        "summary": ai_summary
                    }
                }).execute()

                # Post update in Band room and mention routing agent to assign department
                routing_agent_id = os.environ.get("BAND_ROUTING_AGENT_ID")
                
                msg_content = f"✅ Complaint {grievance_id} is AI_VERIFIED.\nAI Summary: {ai_summary}\n@routing_agent Please assign the department and calculate the SLA deadline."
                
                await tools.send_message(
                    content=msg_content,
                    mentions=[{"id": routing_agent_id}] if routing_agent_id else None
                )

        except Exception as err:
            print(f"[Vision Agent] Error processing grievance {grievance_id}: {err}")
            await tools.send_event(
                content=f"Error analyzing grievance {grievance_id}: {str(err)}",
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
    agent_id = os.environ.get("BAND_VISION_AGENT_ID")
    api_key = os.environ.get("BAND_VISION_API_KEY")
    if not agent_id or not api_key:
        print("[Vision Agent] Missing credentials. Skipping start.")
        return

    print("[Vision Agent] Initializing...")
    agent = Agent.create(
        adapter=VisionValidatorAdapter(),
        agent_id=agent_id,
        api_key=api_key
    )
    async with agent:
        asyncio.create_task(send_heartbeat("vision_agent", supabase))
        await agent.run_forever()

if __name__ == "__main__":
    asyncio.run(main())
