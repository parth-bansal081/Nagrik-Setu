# App Flow Document
## Nagrik Setu v2.0

---

## Flow A: Citizen Submits a Grievance

```
Citizen opens / (Submission Page)
        │
        ├── Enters name + phone number
        ├── Drops pin on Leaflet map (lat/lng captured)
        ├── Selects category (Roads/Water/Electricity/Others)
        ├── Writes description
        └── Uploads photo (mandatory)
                │
                ▼
        Clicks "Submit Complaint"
                │
                ▼
        POST /api/grievances
                │
                ▼
        API checks PostGIS — is there an open ticket
        of same category within 100m?
                │
        ┌───── YES ─────────────────────────────┐
        │                                       │
        │   Return existing ticket ID           │
        │   Show: "This issue is already        │
        │   being tracked. Your report          │
        │   has been linked."                   │
        │                                       │
        └───────────────────────────────────────┘
                │
        ┌───── NO ──────────────────────────────┐
        │                                       │
        │   Create grievance in Supabase        │
        │   Status: PENDING                     │
        │   Generate UUID                       │
        │                                       │
        │   Trigger Vision Agent via Band       │
        │                                       │
        │   [Vision Agent]                      │
        │   → Sends photo to Gemini Flash       │
        │   → Gets: valid?, category,           │
        │     severity, confidence, summary     │
        │                                       │
        │   IF invalid image:                   │
        │   → Update status: REJECTED           │
        │   → Citizen sees rejection reason     │
        │                                       │
        │   IF valid:                           │
        │   → Update Supabase with AI data      │
        │   → Status: AI_VERIFIED               │
        │   → Mention @routing_agent in room    │
        │                                       │
        │   [Routing Agent]                     │
        │   → Maps category → department        │
        │   → Calculates deadline               │
        │     (High severity = 50% shorter)     │
        │   → Updates Supabase                  │
        │   → Status: ROUTED                    │
        │                                       │
        │   Citizen sees: Grievance ID + "Your  │
        │   complaint is being reviewed by AI"  │
        │                                       │
        └───────────────────────────────────────┘
```

---

## Flow B: Citizen Tracks Their Complaint

```
Citizen opens /track/[id]
        │
        ▼
GET /api/grievances/[id]
        │
        ▼
Page renders:
  ┌─────────────────────────────────────┐
  │  STEPPER TIMELINE                   │
  │  ● Reported          ✓ done         │
  │  ● AI Verified       ✓ done         │
  │  ● Routed            ✓ done         │
  │  ● In Progress       ← current      │
  │  ○ Resolved          pending        │
  │                                     │
  │  Department: Jal Shakti             │
  │  Severity: High                     │
  │  Deadline: 12 hours remaining       │
  │  AI Summary: "Burst pipe visible.." │
  └─────────────────────────────────────┘
        │
        ▼
Citizen sees mood buttons (if status not Resolved):
  😤 Frustrated   😞 Unhappy   😐 Patient
        │
        ▼ (if Frustrated or Unhappy clicked)
POST /api/grievances/[id]/mood
        │
        ▼
Supabase: isHighPriority = true
Admin dashboard: ticket pulses red
```

---

## Flow C: Admin Reviews and Resolves

```
Admin opens /admin
        │
        ▼
GET /api/grievances?department=all&status=all
        │
        ▼
Table renders all tickets
  - Department filter dropdown
  - Status filter dropdown
  - High priority tickets: red pulsing border
  - Escalated tickets: orange badge
        │
        ▼
Admin clicks a ticket row → expands:
  - AI photo + analysis
  - Location on mini map
  - Timeline history
  - Status dropdown
        │
        ▼
Admin changes status to "In Progress"
  → PATCH updates Supabase directly
        │
        ▼
Admin changes status to "Resolved"
  → BLOCKED — modal appears:
        │
        ▼
  ┌─────────────────────────────────────┐
  │  RESOLUTION REQUIRED               │
  │                                     │
  │  1. Upload after-photo              │
  │     [Choose File]                   │
  │                                     │
  │  2. Confirm your location           │
  │     [Get My GPS Location]           │
  │                                     │
  │  [Submit Resolution]                │
  └─────────────────────────────────────┘
        │
        ▼
POST /api/grievances/[id]/resolve
  { afterPhotoBase64, adminLat, adminLng }
        │
        ▼
[Verification Agent triggered via Band]
        │
        ├── Sends after-photo to Gemini Flash
        │   → Confirms infrastructure looks resolved
        │
        ├── Haversine formula:
        │   distance(adminLat/Lng, originalLat/Lng)
        │   → Must be ≤ 100 meters
        │
        ├── BOTH pass:
        │   → Status: RESOLVED
        │   → afterPhotoURL saved
        │   → Timestamp logged
        │   → Leaderboard stats updated
        │
        └── EITHER fails:
            → Returns specific error to admin
            → "Your location is 340m away from
               the complaint site"
            → "After photo does not show resolved
               infrastructure"
```

---

## Flow D: Watchdog Escalation (Background)

```
Every 5 minutes — Watchdog Agent runs:
        │
        ▼
Query Supabase:
  WHERE status IN ('ROUTED', 'IN_PROGRESS')
  AND deadline < NOW()
  AND status != 'RESOLVED'
        │
        ▼
For each overdue ticket:
        │
        ├── escalationLevel + 1
        ├── isHighPriority = true
        ├── Append to history:
        │   { event: 'ESCALATED', timestamp: now,
        │     level: escalationLevel }
        └── Post alert in Band room
                │
                ▼
        Admin dashboard shows escalation badge
        Ticket moves to top of queue
```

---

## Flow E: Leaderboard

```
Anyone opens /leaderboard
        │
        ▼
GET /api/leaderboard
        │
        ▼
Supabase aggregation query:
  GROUP BY department
  → avg resolution time
  → resolution rate (resolved / total)
  → escalation rate (escalated / total)
        │
        ▼
Ranked table rendered:
  🥇 Jal Shakti    94% resolved   avg 18hrs
  🥈 DISCOM        87% resolved   avg 31hrs
  🥉 PWD           72% resolved   avg 58hrs
  4. General       61% resolved   avg 79hrs
```

---

## Status State Machine

```
PENDING
  └── (Vision Agent validates) ──► AI_VERIFIED
                                        │
                              (Routing Agent assigns) ──► ROUTED
                                                              │
                                                    (Admin action) ──► IN_PROGRESS
                                                                            │
                                          ┌─────────────────────────────────┤
                                          │                                 │
                               (Verification passes)           (Deadline missed)
                                          │                                 │
                                       RESOLVED                         ESCALATED
                                                                            │
                                                                    (Admin resolves)
                                                                            │
                                                                        RESOLVED

PENDING / AI_VERIFIED ──► REJECTED  (invalid image or spam)
```
