# Technical Specification
## Nagrik Setu v2.0

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CITIZEN / ADMIN                     │
│              Next.js Frontend (Railway)              │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (fetch)
                    ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Routes (/api/*)             │
│         (acts as thin gateway to Supabase)           │
└───────┬───────────────────────────┬─────────────────┘
        │ Supabase SDK              │ Band HTTP trigger
        ▼                           ▼
┌───────────────┐        ┌──────────────────────────┐
│   Supabase    │        │      Band Platform        │
│  (Postgres +  │◄──────►│  4 Agents communicating  │
│   PostGIS)    │        │  through Band rooms       │
└───────────────┘        └──────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │  Gemini Flash    │
                         │  Vision API      │
                         └──────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR + API routes in one, easy Railway deploy |
| Styling | Tailwind CSS | Fast, consistent, no CSS files |
| Maps | Leaflet.js + react-leaflet | Interactive pin-drop, free |
| Database | Supabase (Postgres + PostGIS) | Free tier, realtime, geospatial out of the box |
| Agent Framework | Band SDK (thenvoi) | Hackathon requirement |
| Agent Brain | Gemini Flash 1.5 | Free via Google AI Studio, supports vision |
| Agent Language | Python 3.11 | Band SDK is Python |
| Deployment | Railway | Single platform for both Next.js and Python agents |
| Language Toggle | i18next (react-i18next) | Simple EN/HI switching |

---

## 3. Repository Structure

```
nagrik-setu/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Citizen submission page
│   ├── track/
│   │   └── [id]/page.tsx         # Tracking page
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   ├── leaderboard/
│   │   └── page.tsx              # Leaderboard
│   └── api/
│       ├── grievances/
│       │   ├── route.ts          # POST new grievance, GET all
│       │   └── [id]/
│       │       ├── route.ts      # GET single grievance
│       │       ├── mood/route.ts # POST mood update
│       │       └── resolve/route.ts # POST resolution attempt
│       └── leaderboard/
│           └── route.ts          # GET leaderboard stats
├── components/
│   ├── MapPicker.tsx             # Leaflet pin-drop component
│   ├── StatusStepper.tsx         # Timeline stepper
│   ├── MoodButtons.tsx           # Emoji escalation
│   ├── GrievanceTable.tsx        # Admin table
│   ├── LeaderboardTable.tsx      # Leaderboard
│   └── LanguageToggle.tsx        # EN/HI switcher
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── translations/
│       ├── en.json
│       └── hi.json
├── agents/                       # Python Band agents
│   ├── vision_agent.py
│   ├── routing_agent.py
│   ├── watchdog_agent.py
│   ├── verification_agent.py
│   ├── agent_config.yaml         # Band credentials
│   └── requirements.txt
├── public/
├── .env.local
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 4. API Routes

| Method | Route | Description | Body / Params |
|---|---|---|---|
| POST | `/api/grievances` | Submit new grievance | `name, phone, lat, lng, category, description, imageBase64` |
| GET | `/api/grievances` | Get all grievances | Query: `?department=PWD&status=Pending` |
| GET | `/api/grievances/[id]` | Get single grievance | Param: `id` |
| POST | `/api/grievances/[id]/mood` | Update citizen mood | `mood: frustrated/unhappy/patient` |
| POST | `/api/grievances/[id]/resolve` | Admin resolution attempt | `afterPhotoBase64, adminLat, adminLng` |
| GET | `/api/leaderboard` | Department rankings | — |

---

## 5. Band Agent Configuration

Each agent runs as a separate Python process on Railway.

```yaml
# agent_config.yaml
agents:
  vision:
    agent_id: ${BAND_VISION_AGENT_ID}
    api_key: ${BAND_VISION_API_KEY}

  routing:
    agent_id: ${BAND_ROUTING_AGENT_ID}
    api_key: ${BAND_ROUTING_API_KEY}

  watchdog:
    agent_id: ${BAND_WATCHDOG_AGENT_ID}
    api_key: ${BAND_WATCHDOG_API_KEY}

  verification:
    agent_id: ${BAND_VERIFICATION_AGENT_ID}
    api_key: ${BAND_VERIFICATION_API_KEY}
```

---

## 6. Agent Communication Flow

```
New Grievance Submitted
        │
        ▼
[Vision Agent] ──── analyzes photo ────► saves to Supabase
        │                                (status: AI_VERIFIED)
        │ mentions @routing_agent in Band room
        ▼
[Routing Agent] ──── sets department + deadline ────► saves to Supabase
                                                       (status: ROUTED)

Every 5 minutes:
[Watchdog Agent] ──── checks overdue tickets ────► escalates in Supabase

Admin clicks Resolve:
[Verification Agent] ──── checks photo + GPS ────► resolves or blocks
```

---

## 7. Supabase PostGIS Setup

Enable PostGIS extension in Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Spatial dedup query (100m radius):
```sql
SELECT * FROM grievances
WHERE status NOT IN ('Resolved', 'Rejected')
AND category = $1
AND ST_DWithin(
  location::geography,
  ST_MakePoint($2, $3)::geography,
  100
);
```

---

## 8. Gemini Flash Vision Prompt (Vision Agent)

```
You are a civic infrastructure validator.

Analyze this image and respond ONLY with valid JSON:
{
  "isValidInfrastructure": boolean,
  "category": "Roads" | "Water Supply" | "Electricity" | "Others" | null,
  "severity": "Low" | "Medium" | "High" | null,
  "confidence": 0.0-1.0,
  "summary": "one sentence description"
}

Rules:
- isValidInfrastructure must be true only if image shows a real outdoor civic issue
- Reject selfies, memes, screenshots, indoor photos
- severity High = immediate danger to public (deep pothole, burst pipe, live wire)
```

---

## 9. Deployment on Railway

3 Railway services:

| Service | Type | Start Command |
|---|---|---|
| `nagrik-setu-web` | Node.js | `npm run start` |
| `nagrik-setu-agents` | Python | `python agents/run_all.py` |

`run_all.py` starts all 4 agents as concurrent async tasks using `asyncio.gather()`.
