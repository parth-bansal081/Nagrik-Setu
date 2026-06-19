# V2 Changes Document
## Nagrik Setu — What Changes in Version 2

---

## 1. Layout Fix — Remove the Compressed Middle Column

**Problem:** Current build has everything squeezed into a narrow centered `max-w-2xl` column. Looks like a form, not a product.

**Fix:** 
- Full-width layout with proper section structure like the previous Vercel build
- Submission page gets a hero banner (navy card, full width) above the form — exactly like the previous build's "Report a Local Issue" banner
- Form section uses `max-w-4xl` not `max-w-2xl`
- Map takes full width of the form container
- Admin dashboard uses full viewport width with sidebar

---

## 2. What to Keep from Previous Vercel Build (UI Reference)

| Element | Keep It |
|---|---|
| Hero banner on report page (navy, full bleed) | ✅ Yes |
| Wider form layout | ✅ Yes |
| Navbar with emoji/icon next to nav items | ✅ Yes |
| Admin sidebar (status filters on left) | ✅ Yes |
| Track page clean minimal design | ✅ Yes |
| "Citizen-Government Bridge" subtitle | ✅ Yes |

---

## 3. Leaderboard → Department Accountability Index (DAI)

**Remove:** Simple leaderboard table with resolution rate + avg time

**Replace with:** Full Accountability Index page with 3 tabs

### Route: `/accountability`
### Navbar label: "Accountability Index" (replace "Leaderboard")

---

### 3.1 The DAI Formula

```
DAI Score (0-100) = 
  Resolution Rate Score   (35 pts max)
  + Speed Score           (25 pts max)  
  + Happiness Score       (25 pts max)
  - Escalation Penalty    (15 pts max deduction)
```

**Resolution Rate Score:**
```
(resolved_tickets / total_tickets) × 35
```

**Speed Score:**
```
(1 - avg_resolution_hours / SLA_benchmark_hours) × 25
Minimum: 0 (can't go negative)
SLA benchmarks: Water=24hrs, Electricity=48hrs, Roads=72hrs, Others=96hrs
```

**Happiness Score:**
```
Patient mood   = 1.0
Unhappy mood   = 0.4  
Frustrated     = 0.0
No mood data   = 0.6 (neutral default)

avg_mood_score × 25
```

**Escalation Penalty:**
```
(escalated_tickets / total_tickets) × 15
```

**Grade Bands:**
```
90-100 → A+  Excellent  (green)
75-89  → A   Good       (light green)  
60-74  → B   Average    (yellow)
40-59  → C   Poor       (orange)
0-39   → D   Critical   (red)
```

---

### 3.2 Three Tabs

**Tab 1: National (State vs State)**
- Shows all Indian states ranked by DAI
- For MVP: seed realistic data for 10-15 states
- Columns: Rank, State, DAI Score, Grade, Resolved %, Happiness, Escalations

**Tab 2: State View (City vs City)**
- Dropdown to select state
- Shows cities within that state ranked by DAI
- For MVP: seed data for 5-8 cities in Rajasthan
- Live data for our demo city (Chittorgarh)

**Tab 3: Constituency View (Most Granular)**
- Dropdown: State → City → Constituencies
- For MVP: this is where LIVE Supabase data shows
- Our 4 departments (PWD, Jal Shakti, DISCOM, General) appear here
- Each department gets a DAI card with breakdown

---

### 3.3 DAI Card Design

Each entity (state/city/constituency) gets a card:

```
┌─────────────────────────────────────────┐
│  🏛️ Rajasthan                    A  82  │
│  ████████████████░░░░  82/100           │
│                                         │
│  Resolution  91%  ████████████░  32pts  │
│  Speed       78%  ██████████░░░  19pts  │
│  Happiness   68%  █████████░░░░  17pts  │
│  Escalation  12%  ██░░░░░░░░░░  -2pts  │
│                                         │
│  23 total complaints  |  18 resolved   │
└─────────────────────────────────────────┘
```

Progress bar colors:
- Resolution → blue
- Speed → indigo  
- Happiness → green
- Escalation → red (inverse — high % is bad)

---

## 4. Admin Dashboard Improvements

**Keep from previous build:**
- Sidebar with status filters (All / Pending / In Progress / Resolved)
- Full width layout

**Add:**
- Department filter in sidebar (All / PWD / Jal Shakti / DISCOM / General)
- Priority badge on tickets (High Priority — red pulse)
- Escalation level badge (⚠️ Level 1 / 🚨 Level 2)
- Expandable row shows: AI analysis, before photo, mini map, history timeline

---

## 5. Navigation Changes

**Old navbar:** Report Issue | Leaderboard | Admin Dashboard | [हिंदी] | File Complaint

**New navbar:** Home | Report | Track | Accountability Index | Official Dashboard | [EN|हि]

---

## 6. Seed Data Required for Demo

### States (Tab 1):
```
Maharashtra   DAI: 78  Grade: A
Karnataka     DAI: 74  Grade: B
Rajasthan     DAI: 71  Grade: B  ← our demo state (live)
Gujarat       DAI: 68  Grade: B
Tamil Nadu    DAI: 82  Grade: A
Delhi         DAI: 61  Grade: B
UP            DAI: 43  Grade: C
Bihar         DAI: 38  Grade: D
MP            DAI: 55  Grade: C
Haryana       DAI: 66  Grade: B
```

### Cities in Rajasthan (Tab 2):
```
Jaipur        DAI: 79  Grade: A
Jodhpur       DAI: 72  Grade: B
Udaipur       DAI: 75  Grade: A
Ajmer         DAI: 65  Grade: B
Chittorgarh   DAI: 71  Grade: B  ← our demo city (live)
Kota          DAI: 58  Grade: C
Bikaner       DAI: 62  Grade: B
```

### Departments in Chittorgarh (Tab 3 — LIVE from Supabase):
- PWD (Roads)
- Jal Shakti (Water)
- DISCOM (Electricity)
- General Administration

---

## 7. Files to Create/Modify

| File | Action |
|---|---|
| `app/accountability/page.tsx` | Create new (replaces leaderboard) |
| `components/DAICard.tsx` | Create new |
| `components/DAIProgressBar.tsx` | Create new |
| `app/api/accountability/route.ts` | Create new |
| `app/leaderboard/page.tsx` | Delete |
| `app/api/leaderboard/route.ts` | Modify → move logic to accountability |
| `app/page.tsx` | Update layout — remove compression |
| `app/layout.tsx` | Update navbar links |
| `app/admin/page.tsx` | Update to full-width with sidebar |
| `lib/translations/en.json` | Add accountability strings |
| `lib/translations/hi.json` | Add accountability strings |
