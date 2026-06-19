# Implementation Plan
## Nagrik Setu v2.0 — Phased Build

**Total time available:** ~2 days
**Philosophy:** Get something demoable fast, then add features. Never be in a state where nothing works.

---

## Phase 0: Setup (2 hours)

### 0.1 Accounts & Keys — do this FIRST
- [ ] Create Supabase project → get `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- [ ] Enable PostGIS in Supabase SQL editor
- [ ] Create Supabase Storage bucket: `grievance-images`
- [ ] Get Gemini Flash API key from Google AI Studio (free)
- [ ] Create Band account at band.ai
- [ ] Register 4 agents on band.ai → get 4x `agent_id` + `api_key`
- [ ] Use promo code `BANDHACK26` for Band Pro

### 0.2 Project Init
```bash
npx create-next-app@latest nagrik-setu --typescript --tailwind --app
cd nagrik-setu
npm install @supabase/supabase-js react-leaflet leaflet react-i18next i18next uuid
npm install -D @types/leaflet
```

### 0.3 Python Agent Init
```bash
mkdir agents && cd agents
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install thenvoi google-generativeai supabase python-dotenv asyncio
```

### 0.4 Run Supabase Schema
- Copy SQL from `05_SCHEMA.md`
- Run in Supabase SQL editor
- Verify tables + indexes created

---

## Phase 1: Database + API Routes (3 hours)

**Goal:** API works, can store and retrieve grievances. No agents yet.

### 1.1 Supabase client
- [ ] `lib/supabase.ts` — initialize client with env vars

### 1.2 API Routes
- [ ] `POST /api/grievances` — create grievance, spatial dedup check, return ID
- [ ] `GET /api/grievances` — list all with optional filters
- [ ] `GET /api/grievances/[id]` — single grievance + history
- [ ] `POST /api/grievances/[id]/mood` — update citizen mood
- [ ] `POST /api/grievances/[id]/resolve` — resolution attempt (stub for now)
- [ ] `GET /api/leaderboard` — aggregated stats

### 1.3 Test
- Use Postman or curl to hit each endpoint
- Verify data appears in Supabase dashboard

**Checkpoint: APIs work end to end with real data in Supabase**

---

## Phase 2: Frontend Shell (3 hours)

**Goal:** All 4 pages render, look good, connect to API. No agents yet.

### 2.1 Layout + Navbar
- [ ] `app/layout.tsx` — navbar with logo, language toggle, track link
- [ ] `components/LanguageToggle.tsx` — EN/HI switcher
- [ ] `lib/translations/en.json` + `hi.json` — all UI strings

### 2.2 Submission Page
- [ ] `components/MapPicker.tsx` — Leaflet map, pin drop, returns lat/lng
- [ ] `app/page.tsx` — full form: name, phone, map, category, description, photo upload
- [ ] On submit: POST to API, show success with grievance ID
- [ ] On duplicate found: show existing ticket message

### 2.3 Tracking Page
- [ ] `components/StatusStepper.tsx` — vertical timeline with status steps
- [ ] `components/MoodButtons.tsx` — emoji buttons, POST to mood endpoint
- [ ] `app/track/[id]/page.tsx` — fetch grievance, render stepper + mood

### 2.4 Admin Dashboard
- [ ] `components/GrievanceTable.tsx` — table with filters, expandable rows
- [ ] Resolution modal — after-photo upload + GPS capture
- [ ] `app/admin/page.tsx` — fetch all grievances, render table

### 2.5 Leaderboard
- [ ] `app/leaderboard/page.tsx` — fetch stats, render ranked table

**Checkpoint: Full app works with manual data, looks great, demo-able without agents**

---

## Phase 3: Band Agents (4 hours)

**Goal:** Agents are live, connected to Band, updating Supabase automatically.

### 3.1 Vision Agent (`agents/vision_agent.py`)
- [ ] Connect to Band with vision agent credentials
- [ ] Tool: `analyze_image(grievance_id, image_base64)`
  - Calls Gemini Flash vision API
  - Parses JSON response
  - Updates Supabase: ai_category, ai_severity, ai_confidence, ai_summary, status=AI_VERIFIED
  - Mentions @routing_agent in Band room
- [ ] Tool: `reject_grievance(grievance_id, reason)`
  - Updates status=REJECTED

### 3.2 Routing Agent (`agents/routing_agent.py`)
- [ ] Connect to Band with routing agent credentials
- [ ] Tool: `route_grievance(grievance_id, category, severity)`
  - Maps category → department
  - Calculates deadline (with High severity = 50% shorter)
  - Updates Supabase: department_id, department_name, deadline, status=ROUTED

### 3.3 Watchdog Agent (`agents/watchdog_agent.py`)
- [ ] Connect to Band
- [ ] Runs on schedule every 5 minutes using asyncio
- [ ] Tool: `check_overdue_tickets()`
  - Queries Supabase for overdue tickets
  - For each: increments escalation_level, sets is_high_priority=true
  - Inserts to grievance_history
  - Posts alert in Band room

### 3.4 Verification Agent (`agents/verification_agent.py`)
- [ ] Connect to Band
- [ ] Tool: `verify_resolution(grievance_id, after_image_base64, admin_lat, admin_lng)`
  - Sends after-photo to Gemini Flash
  - Haversine distance check
  - If both pass: updates status=RESOLVED, saves after_image_url, resolved_at
  - Returns pass/fail + reason

### 3.5 Wire agents to API
- [ ] Update `POST /api/grievances` to trigger Vision Agent via Band after creating record
- [ ] Update `POST /api/grievances/[id]/resolve` to trigger Verification Agent via Band

### 3.6 `agents/run_all.py`
```python
import asyncio
from vision_agent import main as vision_main
from routing_agent import main as routing_main
from watchdog_agent import main as watchdog_main
from verification_agent import main as verification_main

async def run():
    await asyncio.gather(
        vision_main(),
        routing_main(),
        watchdog_main(),
        verification_main(),
    )

if __name__ == "__main__":
    asyncio.run(run())
```

**Checkpoint: Submit a complaint, watch all 4 agents fire in sequence in Band, see Supabase update in real time**

---

## Phase 4: Polish + Deploy (2 hours)

### 4.1 UI Polish
- [ ] High priority tickets pulse red in admin
- [ ] Escalation badges on tickets
- [ ] Loading states on all async actions
- [ ] Error messages from API surface to UI cleanly
- [ ] Mobile responsiveness check on submission page

### 4.2 Deploy to Railway
- [ ] Push to GitHub
- [ ] Create Railway project → Add service from GitHub
- [ ] Set all environment variables (from `.env.example`)
- [ ] Add Python service for agents (`python agents/run_all.py`)
- [ ] Verify both services healthy
- [ ] Test full flow on live URL

### 4.3 Demo Data
- [ ] Seed 10-15 realistic grievances in Supabase (various statuses, departments)
- [ ] At least 2 escalated tickets visible in admin
- [ ] Leaderboard shows real-looking stats

**Checkpoint: Live URL works, full demo flow runs end to end**

---

## Phase 5: Hackathon Submission (1 hour)

- [ ] Record demo video (max 3 min):
  - Show citizen submitting complaint with photo
  - Show Band room — agents firing in real time
  - Show admin dashboard updating automatically
  - Show watchdog escalating a ticket
  - Show resolution lock working
- [ ] Write GitHub README with:
  - Project description
  - Architecture diagram (copy from Tech Spec)
  - Setup instructions
  - Live demo link
- [ ] Submit on lablab.ai with:
  - GitHub repo link
  - Demo video
  - Live URL
  - Slide deck (5 slides max: problem, solution, agents, demo, impact)

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Band SDK unfamiliar | Read docs first, build simplest agent first, get one working before all 4 |
| Gemini vision gives bad results | Test prompt with 5 real photos before building agent |
| PostGIS spatial query doesn't work | Test dedup query in Supabase SQL editor before wiring to API |
| Railway deploy fails | Test locally first, deploy early in Phase 4 |
| Ran out of time | Phase 2 checkpoint is demo-able without agents — worst case submit that |
