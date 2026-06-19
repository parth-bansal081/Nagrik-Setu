# Product Requirement Document (PRD)
## Nagrik Setu — The Bridge of Trust
**Version:** 2.0 (Rebuilt for Band of Agents Hackathon)
**Date:** June 2026

---

## 1. Problem Statement

Municipal grievance systems in India are black holes. Citizens report issues — potholes, broken pipes, dead streetlights — and hear nothing back. Problems:

- No verification of submitted complaints (spam, irrelevant photos)
- Manual routing to wrong departments causes delays
- Officials mark tickets "Resolved" without doing anything
- No accountability when deadlines are missed
- Duplicate reports of the same issue overwhelm staff
- Citizens have zero visibility into what's happening

---

## 2. Solution

Nagrik Setu is a multi-agent civic intelligence system. Four AI agents — connected through Band — handle every grievance automatically from submission to verified resolution. No manual routing. No ignored deadlines. No fake closures.

---

## 3. Users

| User | What they do |
|---|---|
| **Citizen** | Submits complaint, tracks status, escalates via mood |
| **Admin** | Views tickets by department, updates status, uploads resolution proof |

---

## 4. Pages

### 4.1 Citizen Submission Page (`/`)
- Name + phone number input (no auth required)
- Leaflet interactive map — citizen drops a pin on exact location
- Category selector: Roads / Water Supply / Electricity / Others
- Description text field
- Photo upload (mandatory — agents reject non-infrastructure images)
- On submit: returns unique Grievance ID (UUID)
- If duplicate found within 100m: shows existing ticket ID instead

### 4.2 Tracking Page (`/track/:id`)
- Enter Grievance ID to look up
- Vertical stepper timeline: Reported → AI Verified → Routed → In Progress → Resolved
- Shows: category, department assigned, severity, AI summary, deadline
- Mood escalation buttons: 😤 Frustrated / 😞 Unhappy / 😐 Patient
- Frustrated or Unhappy → ticket flagged as high priority in admin view

### 4.3 Admin Dashboard (`/admin`)
- No login for MVP (access via direct URL)
- Table of all grievances with filters: Department / Status / Priority
- High priority tickets pulse with red border
- Each row expandable: shows AI analysis, photo, location on map
- Status update dropdown: Pending → In Progress → Resolved
- Resolved requires: upload after-photo + GPS within 100m of complaint location
- Cannot mark Resolved without both conditions met

### 4.4 Leaderboard (`/leaderboard`)
- Ranks 4 departments by:
  - Average resolution time
  - Resolution rate (% resolved vs total)
  - Escalation rate (lower is better)
- Updates in real time from Supabase

---

## 5. The 4 Band Agents

### Agent 1: Vision & Validator Agent
- Triggered when new complaint is submitted
- Receives: image (base64), description, category
- Uses Gemini Flash vision to:
  - Verify image shows real outdoor infrastructure problem
  - Extract: confirmed category, severity (Low/Medium/High), AI summary, confidence score
- If confidence < 0.6 or image invalid: rejects submission, returns reason to citizen
- If valid: saves analysis to Supabase, triggers Routing Agent

### Agent 2: Routing Agent
- Triggered by Vision Agent after successful validation
- Receives: confirmed category, severity, grievance ID
- Maps category to department:
  - Roads → PWD (Public Works Department)
  - Water Supply → Jal Shakti
  - Electricity → DISCOM
  - Others → General Administration
- Sets SLA deadline based on category:
  - Water Supply: 24 hours
  - Electricity: 48 hours
  - Roads: 72 hours
  - Others: 96 hours
- If severity is High: cuts deadline by 50%
- Updates Supabase: department, deadline, status → "Routed"

### Agent 3: Watchdog Agent
- Runs on a schedule (every 5 minutes)
- Queries Supabase for tickets where deadline has passed and status is not Resolved
- For each overdue ticket:
  - Increments escalation level
  - Flags as high priority
  - Logs escalation event to history
  - Posts alert in Band room
- Escalation levels: 0 (normal) → 1 (supervisor notified) → 2 (critical)

### Agent 4: Verification Agent
- Triggered when admin attempts to mark ticket as Resolved
- Receives: grievance ID, after-photo (base64), admin GPS coordinates
- Uses Gemini Flash vision to confirm after-photo shows resolved infrastructure
- Checks GPS: admin location must be within 100m of original complaint pin
- If both pass: marks ticket Resolved, saves after-photo, logs timestamp
- If either fails: blocks resolution, returns specific reason to admin

---

## 6. Features Summary

| Feature | Description |
|---|---|
| Spatial Deduplication | PostGIS query — if same category ticket exists within 100m, link instead of creating new |
| Mood Escalation | Citizen emoji triggers high priority flag visible in admin |
| Resolution Lock | After-photo + GPS verification required to close ticket |
| SLA Watchdog | Auto-escalation at 24/48/72/96hr thresholds |
| Bilingual UI | English / Hindi toggle throughout |
| AI Photo Validation | Gemini Flash rejects non-infrastructure images at submission |

---

## 7. Out of Scope (MVP)

- SMS/WhatsApp notifications
- Citizen login/auth
- Multiple admin roles
- Payment or resource allocation
- Mobile app
