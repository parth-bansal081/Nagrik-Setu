# V3 Changes Document
## Nagrik Setu — Full Page Enrichment Update

---

## 1. HOME PAGE (`/`)

### 1.1 User Location Permission
- On page load, browser asks for geolocation permission
- If granted: map centers on user's city, shows "Showing complaints near you"
- If denied: map defaults to Chittorgarh center
- Store permission result in localStorage (don't ask again on revisit)

### 1.2 City Map — All Open Complaints as Pins
Replace the static "How it works" bottom section with a full-width live map:

```
┌─────────────────────────────────────────────────────┐
│  Live Complaint Map — Chittorgarh                   │
│  Showing 3 open issues near you                     │
│                                                     │
│  [Leaflet map — full width, 450px height]           │
│  Pins colored by category:                          │
│  🔴 Roads  🔵 Water  🟡 Electricity  ⚫ Others      │
│                                                     │
│  Click any pin → popup shows:                       │
│  Category | Severity | Status | "Filed 2 hrs ago"  │
└─────────────────────────────────────────────────────┘
```

- Fetch all non-resolved grievances from Supabase
- Each pin colored by category
- Clicking pin shows popup: category, severity, status, time ago
- Does NOT show citizen name or phone (privacy)
- New API route: `GET /api/grievances/map` returns `[{lat, lng, category, severity, status, created_at}]`

### 1.3 Keep existing sections
- Hero banner ✅
- Chittorgarh Civic Analytics card ✅  
- "How Nagrik Setu Works" cards — move above the map, fix truncation

---

## 2. REPORT PAGE (`/report`)

### 2.1 Address Search on Map
Add a search bar above the Leaflet map:
```
[🔍 Search address or landmark...        ]
```
- Use Nominatim (OpenStreetMap free geocoding API) — no API key needed
- URL: `https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5`
- Dropdown shows results → clicking one moves map pin to that location
- Also auto-fills the manual address field below

### 2.2 Manual Address Field
Below the map, add:
```
MANUAL ADDRESS (optional — for reference)
[Street / Colony / Landmark            ]
[City              ] [PIN Code         ]
```
These are text fields, stored in Supabase as `address_text` (add column)
Not required — just helps admin identify location

### 2.3 Photo Preview
After photo upload:
```
┌─────────────────────────────────────┐
│  [thumbnail of uploaded photo]      │
│  photo_name.jpg  (2.3 MB)  [✕ Remove]│
└─────────────────────────────────────┘
```
Show preview immediately using `URL.createObjectURL(file)`

### 2.4 Animated Submission Progress Stepper
When citizen clicks "Submit Grievance", instead of a loading spinner, show:

```
Submitting your complaint...

Step 1: 📤 Uploading evidence photo      ✅ Done
Step 2: 🗄️  Saving to database           ✅ Done  
Step 3: 🤖 AI agents analyzing photo    ⏳ In progress...
Step 4: 🗺️  Routing to department        ⏳ Waiting...

This usually takes 15-30 seconds.
```

- Steps 1 and 2 complete immediately (real)
- Steps 3 and 4 animate with a 2s delay each (simulated — agents run async)
- After step 4 animation: show success screen

### 2.5 Better Success Screen
```
┌─────────────────────────────────────────────────────┐
│  ✅ Complaint Registered Successfully               │
│                                                     │
│  Your Grievance ID:                                 │
│  GRV-2026-FP8XQQ6A                                 │
│  [📋 Copy ID]  [🔗 Share Link]                      │
│                                                     │
│  What happens next:                                 │
│  1. 🤖 AI agents verify your photo (< 1 min)       │
│  2. 🗺️  Auto-routed to correct department           │
│  3. ⏰ SLA deadline assigned (24-72 hrs)            │
│  4. 📍 Resolution verified on-site by official     │
│                                                     │
│  [Track My Complaint →]  [Report Another Issue]    │
└─────────────────────────────────────────────────────┘
```

---

## 3. TRACK PAGE (`/track/[id]`)

### 3.1 Deadline Countdown Timer
In the left panel, replace static "Not calculated yet" with:
```
SLA DEADLINE
⏰ 71 hours 23 minutes remaining
[████████████████░░░░░░░░] 28% elapsed
```
- If deadline exists: show countdown (recalculates every minute)
- Color: green > 50% remaining, yellow 20-50%, red < 20%
- If no deadline yet: show "⏳ Being processed by AI agents..."

### 3.2 Share Button
```
[🔗 Share this complaint]
```
- Copies `https://nagrik-setu.vercel.app/track/{id}` to clipboard
- Shows "Link copied!" toast for 2 seconds

### 3.3 Mini Map of Complaint Location
In left panel below the photo:
```
📍 COMPLAINT LOCATION
[small Leaflet map, 200px height]
[pin at exact lat/lng, non-interactive/static]
```
- `dragging={false}` `zoomControl={false}` `scrollWheelZoom={false}`
- Just shows where the issue was reported

### 3.4 Agent Activity Log
Replace empty timeline steps with rich agent activity:

```
GRIEVANCE TIMELINE

● 1. Reported                    Jun 19, 12:06 AM
     Filed by citizen from Chittorgarh

● 2. AI Verified                 Jun 19, 12:07 AM  
     🤖 Vision Agent: "Severe road damage detected.
     Pothole with exposed base, high traffic risk."
     Confidence: 94% | Severity: High

● 3. Routed                      Jun 19, 12:07 AM
     🗺️ Routing Agent: Assigned to PWD (Roads)
     SLA Deadline: 36 hours (High severity)

◐ 4. In Progress                 Awaiting update

○ 5. Resolved                    Pending
```

- Pull from `grievance_history` table
- Each history event renders differently based on `actor` field
- Vision Agent events show AI summary + confidence
- Routing Agent events show department + deadline reason

---

## 4. ACCOUNTABILITY PAGE (`/accountability`)

### 4.1 Bar Chart — Department Performance
In Constituency tab, above the DAI cards, add a horizontal bar chart:

```
Department Performance — Chittorgarh (Live)

Jal Shakti  ████████████████████  82  A
DISCOM      ███████████████░░░░░  71  B  
PWD         ██████████████░░░░░░  68  B
General     ████████████░░░░░░░░  55  C
```

- Use `recharts` `BarChart` or simple CSS bars (no library needed)
- Bars colored by grade: green (A), yellow (B), orange (C), red (D)
- Animate on tab switch using CSS transition

### 4.2 Trend Arrows
In National and State tables, add trend column:
```
Tamil Nadu   82  A  ↑ +3
Maharashtra  78  A  → 0
Karnataka    74  B  ↓ -2
Rajasthan    71  B  ↑ +1  🔴 LIVE
```
- All hardcoded seed data — just pick realistic numbers
- Green ↑, gray →, red ↓

### 4.3 Live DAI Cards — Constituency Tab
Each department gets a full card (already designed in V2 doc, now actually build it):

```
┌──────────────────────────────────────────────┐
│  🏗️ PWD — Roads                    B   68    │
│  [████████████████░░░░░░░░] 68/100           │
│                                              │
│  Resolution Rate  ████████████░  80%  28pts  │
│  Speed Score      ████████░░░░░  65%  16pts  │
│  Happiness Score  ███████░░░░░░  55%  14pts  │
│  Escalation Rate  ███░░░░░░░░░░  18%  -3pts  │
│                                              │
│  34 total  |  27 resolved  |  2 escalated   │
│  Avg: 58hrs  |  SLA: 72hrs                  │
└──────────────────────────────────────────────┘
```

- Fetched from `GET /api/accountability` (real Supabase data)
- DAI calculated on frontend using formula from V2 doc
- If no data yet: show placeholder card with "No complaints yet"

### 4.4 Score Explainer
Above the tabs, add a collapsible "How is this score calculated?" section:

```
ℹ️ How is the DAI Score calculated?  [▼ expand]

Resolution Rate (35%) — % of complaints resolved
Speed Score (25%)     — How fast vs SLA deadline  
Happiness Score (25%) — Citizen mood feedback
Escalation Penalty (15%) — Deducted for missed SLAs
```

---

## 5. ADMIN PAGE (`/admin`)

### 5.1 Analytics Header
Above the grievances table, add 4 stat cards:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📋 Total │ │ ⏳ Pending│ │ ✅ Today │ │ ⚠️ Escalated│
│    3     │ │    3     │ │    0     │ │    0     │
│ complaints│ │ awaiting │ │ resolved │ │ need attn│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```
- All from real Supabase data via `GET /api/admin/stats`

### 5.2 Agent Status Panel
Below analytics, above the table:

```
BAND AGENT STATUS
🟢 Vision Agent      Online    Last active: 2 min ago
🟢 Routing Agent     Online    Last active: 2 min ago  
🟡 Watchdog Agent    Idle      Next run: 3 min
🔴 Verification Agent Offline  Not connected
```

- Store agent heartbeat in Supabase table `agent_status`
- Each Python agent writes `{agent_name, last_seen: NOW()}` to Supabase every 60s
- API reads this and shows online if last_seen < 2 minutes ago
- New table: `agent_status` with columns: `agent_name, last_seen, status`

### 5.3 Expandable Ticket Details
Clicking "Details" on any row opens an expanded panel below that row (not a modal):

```
┌─────────────────────────────────────────────────────┐
│  GRV-2026-FP8XQQ6A  — DETAILS                      │
│                                                     │
│  [Before Photo]        [Mini Leaflet Map]           │
│  [image thumbnail]     [pin at complaint location]  │
│                                                     │
│  AI Analysis:                                       │
│  "Severe road damage. Deep pothole with exposed    │
│  base material. High traffic risk."                 │
│  Confidence: 94% | AI Category: Roads | Sev: High  │
│                                                     │
│  History:                                           │
│  Jun 19, 12:06  SUBMITTED by citizen               │
│  Jun 19, 12:07  AI_VERIFIED by Vision Agent        │
│  Jun 19, 12:07  ROUTED to PWD by Routing Agent     │
│                                                     │
│  Status: [Pending ▼] [Update]  [Mark Resolved →]  │
└─────────────────────────────────────────────────────┘
```

---

## 6. New API Routes Needed

| Route | Method | Description |
|---|---|---|
| `/api/grievances/map` | GET | Returns `[{lat, lng, category, severity, status, created_at}]` for map pins |
| `/api/admin/stats` | GET | Returns `{total, pending, resolvedToday, escalated}` |
| `/api/agent-status` | GET | Returns agent online/offline status from `agent_status` table |
| `/api/agent-status` | POST | Python agents POST heartbeat every 60s |

---

## 7. New Supabase Changes

### Add column to `grievances`:
```sql
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS address_text TEXT;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS address_pincode TEXT;
```

### New table `agent_status`:
```sql
CREATE TABLE agent_status (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name  TEXT UNIQUE NOT NULL,
  last_seen   TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT DEFAULT 'offline'
);

INSERT INTO agent_status (agent_name, status) VALUES
  ('vision_agent', 'offline'),
  ('routing_agent', 'offline'),
  ('watchdog_agent', 'offline'),
  ('verification_agent', 'offline');
```

---

## 8. Python Agent Change — Heartbeat

Add to each agent's main loop (every 60 seconds):
```python
async def send_heartbeat(agent_name: str, supabase_client):
    supabase_client.table('agent_status').upsert({
        'agent_name': agent_name,
        'last_seen': datetime.utcnow().isoformat(),
        'status': 'online'
    }).execute()
```

---

## 9. Files to Create/Modify

| File | Action |
|---|---|
| `app/page.tsx` | Add location permission + live map + fix how-it-works |
| `app/report/page.tsx` | Add address search, manual address, photo preview, progress stepper, better success |
| `app/track/[id]/page.tsx` | Add countdown timer, share button, mini map, agent activity log |
| `app/accountability/page.tsx` | Add bar chart, trend arrows, DAI cards, score explainer |
| `app/admin/page.tsx` | Add analytics header, agent status panel, expandable details |
| `app/api/grievances/map/route.ts` | Create new |
| `app/api/admin/stats/route.ts` | Create new |
| `app/api/agent-status/route.ts` | Create new (GET + POST) |
| `agents/vision_agent.py` | Add heartbeat |
| `agents/routing_agent.py` | Add heartbeat |
| `agents/watchdog_agent.py` | Add heartbeat |
| `agents/verification_agent.py` | Add heartbeat |

---

## 10. Order of Implementation

1. Supabase changes (SQL — 10 mins)
2. New API routes (30 mins)
3. Home page map (30 mins)
4. Report page improvements (45 mins)
5. Track page enrichment (30 mins)
6. Admin analytics + agent status + expandable details (45 mins)
7. Accountability charts + DAI cards (30 mins)
8. Python agent heartbeats (15 mins)
