# Design Document
## Nagrik Setu v2.0

---

## 1. Design Philosophy

Government-tech aesthetic — trustworthy, serious, clean. Not a startup landing page. Not Material Design generic. Think: Aadhaar portal meets modern civic dashboard. Citizens should feel this is official. Admins should feel it is powerful.

---

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1A3A5C` | Deep navy — headers, primary buttons, active states |
| `primary-light` | `#2563EB` | Links, stepper active, highlights |
| `accent` | `#F97316` | Escalated/urgent badges, watchdog alerts |
| `success` | `#16A34A` | Resolved status, success states |
| `danger` | `#DC2626` | High priority pulse, rejection messages |
| `warning` | `#D97706` | Medium severity, watchdog level 1 |
| `surface` | `#F8FAFC` | Page backgrounds |
| `card` | `#FFFFFF` | Card backgrounds |
| `border` | `#E2E8F0` | Default borders |
| `text-primary` | `#0F172A` | Main text |
| `text-secondary` | `#64748B` | Labels, metadata |

---

## 3. Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Page title | Inter | 28px | 700 |
| Section heading | Inter | 20px | 600 |
| Card title | Inter | 16px | 600 |
| Body text | Inter | 14px | 400 |
| Label / metadata | Inter | 12px | 400 |
| Badge | Inter | 11px | 600 |

Google Fonts import: `Inter` (weights 400, 600, 700)

---

## 4. Component Patterns

### Status Badge
```
PENDING     → gray bg, gray text
AI_VERIFIED → blue bg, white text
ROUTED      → indigo bg, white text
IN_PROGRESS → yellow bg, dark text
ESCALATED   → orange bg, white text, pulsing ring
RESOLVED    → green bg, white text
REJECTED    → red bg, white text
```

### Priority Indicator
- Normal: default card border
- High Priority: `border-2 border-red-500 animate-pulse`
- Escalated Level 2: `border-2 border-orange-500 shadow-orange-200 shadow-lg`

### Severity Dot
- Low: green dot `●`
- Medium: yellow dot `●`
- High: red dot `●` (animated pulse)

---

## 5. Page-by-Page Layout

### 5.1 Submission Page (`/`)

```
┌─────────────────────────────────────────────┐
│  🏛️ Nagrik Setu          [EN | हि]  [Track] │
├─────────────────────────────────────────────┤
│                                             │
│  Report a Civic Issue                       │
│  ─────────────────────                      │
│                                             │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Your Name    │  │ Phone Number         │ │
│  └──────────────┘  └──────────────────────┘ │
│                                             │
│  📍 Pin your location on the map            │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │         [Leaflet Map]               │    │
│  │    (click to drop pin)              │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│  Lat: 24.8829  Lng: 74.6269                 │
│                                             │
│  Category                                   │
│  [Roads ▼]                                  │
│                                             │
│  Describe the issue                         │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Upload Evidence Photo (required)           │
│  ┌─────────────────────────────────────┐    │
│  │  📷 Click to upload or drag & drop  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [     Submit Complaint     ]               │
│                                             │
└─────────────────────────────────────────────┘
```

On success:
```
┌─────────────────────────────────────────────┐
│  ✅ Complaint Registered                    │
│                                             │
│  Your Grievance ID:                         │
│  GRV-2026-A3F9B2C1                         │
│  [Copy ID]                                  │
│                                             │
│  AI agents are analyzing your complaint.   │
│  Track status at /track/GRV-2026-A3F9B2C1  │
│  [Track My Complaint →]                     │
└─────────────────────────────────────────────┘
```

---

### 5.2 Tracking Page (`/track/[id]`)

```
┌─────────────────────────────────────────────┐
│  🏛️ Nagrik Setu          [EN | हि]          │
├─────────────────────────────────────────────┤
│  GRV-2026-A3F9B2C1                          │
│  Roads  ●High  PWD Department               │
│  Submitted: Jun 18, 2026, 2:34 PM           │
│  Deadline: Jun 21, 2026, 2:34 PM            │
├─────────────────────────────────────────────┤
│                                             │
│  ●── Reported              Jun 18, 2:34 PM  │
│  │                                          │
│  ●── AI Verified           Jun 18, 2:35 PM  │
│  │   "Deep pothole posing traffic risk"     │
│  │                                          │
│  ●── Routed to PWD         Jun 18, 2:35 PM  │
│  │                                          │
│  ◐── In Progress           Jun 18, 4:00 PM  │
│  │                                          │
│  ○── Resolved              Pending          │
│                                             │
├─────────────────────────────────────────────┤
│  How do you feel about the response?        │
│                                             │
│  [😤 Frustrated] [😞 Unhappy] [😐 Patient]  │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 5.3 Admin Dashboard (`/admin`)

```
┌─────────────────────────────────────────────────────┐
│  🏛️ Nagrik Setu — Admin       [EN | हि]             │
├─────────────────────────────────────────────────────┤
│  Department [All ▼]   Status [All ▼]   [🔍 Search]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ● GRV-001  Roads  HIGH  PWD  IN_PROGRESS    │    │
│  │   Chittorgarh, Rajasthan — 8hrs overdue     │    │
│  │   [View Details ▼]                          │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ GRV-002  Water  MED  Jal Shakti  ROUTED     │    │
│  │   Submitted 2hrs ago — 22hrs remaining      │    │
│  │   [View Details ▼]                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Expanded row:
```
┌─────────────────────────────────────────────────────┐
│  Before Photo        Mini Map (Leaflet)             │
│  [image]             [📍 pin at location]           │
│                                                     │
│  AI Summary: "Burst water main, road flooding"     │
│  Confidence: 94%    Severity: High                  │
│                                                     │
│  Status: [In Progress ▼]  [Update Status]           │
│                                                     │
│  [Mark as Resolved] → triggers modal                │
└─────────────────────────────────────────────────────┘
```

---

### 5.4 Leaderboard (`/leaderboard`)

```
┌─────────────────────────────────────────────┐
│  🏛️ Nagrik Setu — Department Rankings       │
├─────────────────────────────────────────────┤
│  City Performance — June 2026               │
├─────────────────────────────────────────────┤
│                                             │
│  🥇  Jal Shakti                             │
│      Resolution Rate: 94%                  │
│      Avg Time: 18 hrs                       │
│      Escalation Rate: 2%                   │
│                                             │
│  🥈  DISCOM                                 │
│      Resolution Rate: 87%                  │
│      Avg Time: 31 hrs                       │
│      Escalation Rate: 8%                   │
│                                             │
│  🥉  PWD                                    │
│      Resolution Rate: 72%                  │
│      Avg Time: 58 hrs                       │
│      Escalation Rate: 15%                  │
│                                             │
│  4.  General Admin                          │
│      Resolution Rate: 61%                  │
│      Avg Time: 79 hrs                       │
│      Escalation Rate: 22%                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. Language Toggle

- Top right of navbar: `[EN | हि]`
- Switches all UI labels, placeholders, status text, button labels
- Grievance data (description, AI summary) stays in original language
- Stored in localStorage

---

## 7. Responsive Behaviour

- Mobile first — submission page is primary mobile use case
- Admin dashboard — desktop optimized (table layout)
- Leaderboard — works on both
- Map component: full width on mobile, 60% on desktop
