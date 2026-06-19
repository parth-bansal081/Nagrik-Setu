# Rules
## Nagrik Setu v2.0 — Coding Rules & Conventions

These rules exist so every part of the codebase is consistent and any AI assistant can pick up where you left off without confusion.

---

## 1. General Rules

- **Never break a working checkpoint.** If Phase 2 works, don't touch Phase 2 files while building Phase 3. Build forward, not sideways.
- **One feature at a time.** Finish it, test it, commit it. Don't half-build three things.
- **If it works, commit it.** Small commits. Every 30-60 minutes push to GitHub.
- **No dead code.** Don't comment out old code. Delete it. Git history is your safety net.
- **Test each API route with curl or Postman before wiring it to the frontend.**

---

## 2. File & Folder Naming

| Type | Convention | Example |
|---|---|---|
| Next.js pages | lowercase folders, `page.tsx` | `app/admin/page.tsx` |
| Components | PascalCase | `StatusStepper.tsx` |
| API routes | `route.ts` inside folder | `app/api/grievances/route.ts` |
| Python agents | snake_case | `vision_agent.py` |
| Utility functions | camelCase | `haversineDistance()` |
| Constants | SCREAMING_SNAKE | `MAX_DEDUP_RADIUS = 100` |

---

## 3. TypeScript Rules

- Always type API responses. No `any`.
- Grievance type lives in `lib/types.ts` and is imported everywhere.
- Use `async/await`. No `.then()` chains.
- Always handle errors with `try/catch` in API routes. Return `{ error: string }` on failure.

```typescript
// lib/types.ts — single source of truth
export type GrievanceStatus =
  | 'PENDING' | 'AI_VERIFIED' | 'ROUTED'
  | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'REJECTED'

export type Department = 'PWD' | 'JAL_SHAKTI' | 'DISCOM' | 'GENERAL'

export type Severity = 'Low' | 'Medium' | 'High'

export type Category = 'Roads' | 'Water Supply' | 'Electricity' | 'Others'

export interface Grievance {
  id: string
  grievance_id: string
  citizen_name: string
  citizen_phone: string
  latitude: number
  longitude: number
  category: Category
  description: string
  image_url: string | null
  ai_category: Category | null
  ai_severity: Severity | null
  ai_confidence: number | null
  ai_summary: string | null
  department_id: Department | null
  department_name: string | null
  deadline: string | null
  status: GrievanceStatus
  is_high_priority: boolean
  escalation_level: number
  citizen_mood: 'frustrated' | 'unhappy' | 'patient' | null
  master_ticket_id: string | null
  is_duplicate: boolean
  after_image_url: string | null
  location_verified: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface GrievanceHistory {
  id: string
  grievance_id: string
  event: string
  actor: string
  metadata: Record<string, unknown> | null
  created_at: string
}
```

---

## 4. API Route Rules

- Every route returns `{ data, error }` shape.
- On success: `{ data: <result>, error: null }`
- On failure: `{ data: null, error: "message" }` with appropriate HTTP status
- Always validate required fields before hitting Supabase.

```typescript
// Standard API route pattern
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate
    if (!body.citizen_name) {
      return Response.json({ data: null, error: 'Name is required' }, { status: 400 })
    }
    
    // Do work
    const { data, error } = await supabase.from('grievances').insert(...)
    if (error) throw error
    
    return Response.json({ data, error: null }, { status: 201 })
  } catch (err) {
    return Response.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 5. Python Agent Rules

- Each agent file is self-contained. No shared state between agents.
- Agents communicate ONLY through Band rooms. Not through direct function calls.
- All Supabase calls from agents use the service role key (not anon key).
- Every agent action logs to `grievance_history` table.
- Always parse Gemini response defensively — wrap in try/except, have a fallback.

```python
# Standard Gemini response parsing
try:
    response_text = response.text.strip()
    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
    result = json.loads(response_text)
except (json.JSONDecodeError, IndexError):
    # Fallback — reject the grievance, don't crash
    result = { "isValidInfrastructure": False, "confidence": 0 }
```

---

## 6. Environment Variables

Never hardcode keys. Always use env vars. Never commit `.env.local`.

All variables are defined in `09_ENV_EXAMPLE.md`. Copy to `.env.local` and fill in.

Frontend (Next.js) env vars must be prefixed `NEXT_PUBLIC_` only if they are safe to expose to the browser. Supabase anon key = safe to expose. Service role key = NEVER expose to browser.

---

## 7. Supabase Rules

- Frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` — read/write where RLS allows.
- Python agents use `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, full access.
- Never call Supabase directly from client components for mutations — always go through API routes.
- Image uploads go to Supabase Storage, not stored as base64 in the database.

---

## 8. Tailwind Rules

- No custom CSS files. Tailwind only.
- No inline styles.
- Color tokens map to Tailwind config — don't use raw hex values in classnames.
- Animation for high priority: `animate-pulse border-2 border-red-500`
- All cards: `bg-white rounded-xl shadow-sm border border-slate-200 p-6`
- All primary buttons: `bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg`

---

## 9. Leaflet Rules

- Always wrap Leaflet in `dynamic()` import with `ssr: false` in Next.js — Leaflet breaks with SSR.
- Map component must receive `onLocationSelect: (lat: number, lng: number) => void` as prop.
- Default map center: Chittorgarh, Rajasthan `[24.8829, 74.6269]`
- Default zoom: 13

```typescript
// Correct Leaflet import in Next.js
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })
```

---

## 10. Git Commit Convention

```
feat: add vision agent Gemini integration
fix: spatial dedup query returning wrong results
style: update admin dashboard high priority pulse
chore: add env vars to railway
docs: update tracker phase 2 complete
```
