<div align="center">

<img src="public/logo.png" alt="Nagrik Setu Logo" width="120"/>

# 🏛️ NAGRIK SETU
### *Bridge of Trust*

**India's first multi-agent civic intelligence platform.**  
Report. Verify. Route. Track. Resolve. — All automated. All accountable.

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-nagrik--setu.railway.app-1A3A5C?style=for-the-badge)](https://nagrik-setu-production.up.railway.app/)
[![Band SDK](https://img.shields.io/badge/Powered_by-Band_SDK-F97316?style=for-the-badge)](https://band.ai)
[![Gemini Flash](https://img.shields.io/badge/AI-Gemini_Flash_1.5-4285F4?style=for-the-badge)](https://aistudio.google.com)
[![Supabase](https://img.shields.io/badge/DB-Supabase_+_PostGIS-3ECF8E?style=for-the-badge)](https://supabase.com)

<br/>

> *"Citizens don't stop filing complaints because they stop caring.*  
> *They stop because they've learned that nothing will happen."*  
> — The problem Nagrik Setu exists to solve.

<br/>

</div>

---

## 🚨 The Problem

Municipal grievance systems across India are black holes.

A citizen sees a burst pipe flooding their street. They call the municipality. They're put on hold. They file a complaint online. They receive no acknowledgment. They check back in two weeks — *"under review."* They check again in a month. The pipe is still burst. They give up. They file nothing next time.

This isn't an edge case. **This is the default experience for 600 million Indians.**

| The Reality | The Number |
|---|---|
| Complaints that receive no response within promised SLA | **73%** |
| Tickets marked "Resolved" without a site visit | **1 in 3** |
| Average days to fix a pothole despite 24hr SLA promises | **47 days** |
| Staff bandwidth wasted on duplicate reports | **40%** |
| Citizens who stop reporting after first ignored complaint | **Majority** |

The system doesn't fail because officials are lazy. It fails because **there is no system** — just a complaint box with no enforcement, no verification, no accountability.

---

## ⚡ The Solution

**Nagrik Setu** replaces the complaint box with a **closed-loop accountability engine** — four AI agents that work together through Band's multi-agent framework to ensure every complaint is verified, routed, tracked, escalated if ignored, and only closed when proven resolved.

```
Citizen submits complaint
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              BAND ORCHESTRATION LAYER               │
│                                                     │
│  👁 Vision Agent  ──►  🗺 Routing Agent             │
│       │                      │                      │
│       ▼                      ▼                      │
│  ⚡ Watchdog Agent    🔒 Verification Agent         │
│  (runs continuously)   (blocks fake closures)       │
└─────────────────────────────────────────────────────┘
         │
         ▼
  Verified. Routed. Tracked. Proven resolved.
```

---

## 🤖 The Four Agents

### 👁 Vision & Validator Agent
> *"No valid photo. No ticket. Zero spam enters the system."*

Powered by **Gemini Flash 1.5 vision**. The moment a complaint is submitted, this agent analyzes the photo to confirm it shows a real outdoor infrastructure problem. Selfies, memes, indoor shots, and irrelevant images are rejected automatically. For valid submissions, it extracts:
- **Category** — Roads, Water Supply, Electricity, or Others
- **Severity** — Low, Medium, or High
- **Confidence Score** — must exceed 60% to proceed
- **AI Summary** — one-sentence description of the scene

---

### 🗺 Routing Agent
> *"Zero manual routing. Zero wrong departments. Zero delays."*

Once validated, this agent maps the complaint to the correct municipal department and enforces strict SLA deadlines:

| Category | Department | Standard SLA | High Severity SLA |
|---|---|---|---|
| Roads | PWD | 72 hours | 36 hours |
| Water Supply | Jal Shakti | 24 hours | 12 hours |
| Electricity | DISCOM | 48 hours | 24 hours |
| Others | General Admin | 96 hours | 48 hours |

---

### ⚡ Watchdog Agent
> *"Deadlines aren't suggestions anymore. They're enforced."*

Runs continuously every 5 minutes. Queries Supabase for every ticket whose deadline has passed without resolution. For each overdue ticket:
- Increments escalation level (0 → 1 → 2)
- Sets `is_high_priority = true`
- Logs escalation event to audit history
- Posts alert in Band room
- Ticket rises to top of admin queue with pulsing red border

No human needs to chase officials. The system does it automatically.

---

### 🔒 Verification Agent
> *"Officials can't mark issues resolved from their desk chair."*

Triggered when an admin attempts to close a ticket. Two conditions must **both** pass — or the ticket stays open:

1. **Photo verification** — Gemini Flash analyzes the after-photo to confirm the infrastructure is actually fixed
2. **GPS verification** — Admin's coordinates must be within **100 meters** of the original complaint location (Haversine formula)

Fail either check: blocked. No exceptions. No workarounds.

---

## 🧠 Department Accountability Index (DAI)

We didn't just build a complaint system. We built a **transparency engine.**

Every department gets a real-time DAI score from 0 to 100:

```
DAI = Resolution Rate (35pts)
    + Speed Score     (25pts)
    + Happiness Score (25pts)
    - Escalation Penalty (15pts)
```

| Component | Weight | What it measures |
|---|---|---|
| Resolution Rate | 35% | % of complaints actually resolved |
| Speed Score | 25% | How fast vs the SLA deadline |
| Happiness Score | 25% | Citizen mood feedback (emoji escalation) |
| Escalation Penalty | -15% | Deducted for every missed deadline |

**Grade bands:** `A+ (90-100)` `A (75-89)` `B (60-74)` `C (40-59)` `D (0-39)`

Viewable across three levels:
- 🇮🇳 **National** — State vs State rankings
- 🏙️ **State View** — City vs City within a state
- 📍 **Constituency** — Live department cards with real Supabase data

For the first time, a citizen can see exactly **why** their ward scores a C — and their MLA can see it too.

---

## ✨ Key Features

| Feature | How it works |
|---|---|
| **Spatial Deduplication** | PostGIS query — if an open ticket exists within 100m for the same category, new reports are linked, not duplicated |
| **Mood Escalation** | Citizens click 😤 Frustrated or 😞 Unhappy → ticket flagged high priority in admin dashboard |
| **Resolution Lock** | After-photo + GPS within 100m required — no GPS match, no closure |
| **Watchdog Escalation** | Every 5 minutes, overdue tickets are auto-escalated with zero human intervention |
| **Live Complaint Map** | Home page shows all open complaints as colored pins by category |
| **Agent Health Monitor** | Admin dashboard shows real-time 🟢🟡🔴 status of all 4 Band agents |
| **Address Search** | Nominatim geocoding — no API key, free, searches by colony/landmark |
| **Bilingual UI** | Full English + Hindi toggle via i18next |
| **Submission Stepper** | Animated 4-step progress during submission — shows AI processing in real time |
| **Countdown Timer** | Track page shows exact hours remaining before SLA deadline, color-coded by urgency |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CITIZEN / ADMIN                          │
│              Next.js 14 Frontend (Railway)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ Next.js API Routes (/api/*)
                        ▼
┌───────────────┐    ┌──────────────────────────────────────┐
│   Supabase    │◄──►│         Band Platform                │
│  PostgreSQL   │    │  4 Python agents in Band rooms       │
│  + PostGIS    │    │  communicating in real-time          │
└───────────────┘    └──────────────────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │  Gemini Flash    │
                         │  Vision API      │
                         │  (Google AI)     │
                         └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Maps | Leaflet.js + react-leaflet |
| Database | Supabase (PostgreSQL + PostGIS) |
| Agent Framework | Band SDK (`thenvoi`) |
| AI Vision | Gemini Flash 1.5 (Google AI Studio) |
| Agent Language | Python 3.11 + asyncio |
| Geocoding | Nominatim (OpenStreetMap, free) |
| i18n | react-i18next (EN + HI) |
| Deployment | Railway (Next.js + Python agents) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Google AI Studio account (Gemini API key)
- Band account (band.ai)

### 1. Clone & Install

```bash
git clone https://github.com/parth-bansal081/nagrik-setu.git
cd nagrik-setu

# Frontend
npm install

# Python agents
cd agents
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install thenvoi google-generativeai supabase python-dotenv
```

### 2. Set up Supabase

Run the schema in your Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id TEXT UNIQUE NOT NULL,
  citizen_name TEXT NOT NULL,
  citizen_phone TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  ai_category TEXT,
  ai_severity TEXT,
  ai_confidence DECIMAL(3,2),
  ai_summary TEXT,
  department_id TEXT,
  department_name TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  is_high_priority BOOLEAN DEFAULT FALSE,
  escalation_level INTEGER DEFAULT 0,
  citizen_mood TEXT,
  address_text TEXT,
  after_image_url TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grievance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID REFERENCES grievances(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT UNIQUE NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'offline'
);

CREATE INDEX idx_grievances_location ON grievances USING GIST(location);
```

### 3. Environment Variables

Create `.env.local` in root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Create `agents/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
BAND_VISION_AGENT_ID=your_agent_id
BAND_VISION_API_KEY=your_api_key
BAND_ROUTING_AGENT_ID=your_agent_id
BAND_ROUTING_API_KEY=your_api_key
BAND_WATCHDOG_AGENT_ID=your_agent_id
BAND_WATCHDOG_API_KEY=your_api_key
BAND_VERIFICATION_AGENT_ID=your_agent_id
BAND_VERIFICATION_API_KEY=your_api_key
```

### 4. Register Band Agents

Go to [band.ai](https://band.ai) → Agents → New Agent → External Agent  
Register **4 agents** and copy each `agent_id` + `api_key` into your `.env`

Use promo code `BANDHACK26` for free Band Pro access.

### 5. Run

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — All 4 Band agents
cd agents
python run_all.py
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
nagrik-setu/
├── app/
│   ├── page.tsx                  # Home — live map + analytics
│   ├── report/page.tsx           # Citizen submission form
│   ├── track/[id]/page.tsx       # Real-time complaint tracker
│   ├── accountability/page.tsx   # DAI — 3-tab accountability index
│   ├── admin/page.tsx            # Official dashboard
│   └── api/
│       ├── grievances/route.ts
│       ├── grievances/[id]/route.ts
│       ├── grievances/map/route.ts
│       ├── grievances/[id]/mood/route.ts
│       ├── grievances/[id]/resolve/route.ts
│       ├── accountability/route.ts
│       └── agent-status/route.ts
├── agents/
│   ├── vision_agent.py
│   ├── routing_agent.py
│   ├── watchdog_agent.py
│   ├── verification_agent.py
│   └── run_all.py
├── components/
│   ├── MapPicker.tsx
│   ├── StatusStepper.tsx
│   ├── MoodButtons.tsx
│   ├── DAICard.tsx
│   └── LanguageToggle.tsx
└── lib/
    ├── supabase.ts
    └── translations/
        ├── en.json
        └── hi.json
```

---

## 🎬 Demo Flow

The fastest way to see everything working:

1. **Submit a complaint** at `/report` — drop a pin on Chittorgarh, upload a pothole photo, submit
2. **Watch Band** — open band.ai and see the agents fire in real-time in the room
3. **Track it** at `/track/{your-id}` — see Vision Agent analysis, department routing, countdown timer
4. **Open admin** at `/admin` — see the ticket appear, agent health panel, analytics
5. **Try to resolve** — click "Mark Resolved" — you'll be blocked without GPS + after-photo
6. **Check accountability** at `/accountability` — see Rajasthan's live DAI score

---

## 🏆 Built For

**Band of Agents Hackathon 2026** on [lablab.ai](https://lablab.ai)  
Track: Regulated & High-Stakes Workflows  
Category: Web Application, Agent Builder, Non-Profit, Sustainability

---

## 📄 License

MIT — use it, fork it, deploy it for your city.

---

<div align="center">

**Every complaint verified. Every deadline tracked. Every resolution proven.**

*Built in 48 hours. Ready for 800 million citizens.*

🏛️ **Nagrik Setu** — Bridge of Trust

</div>
