# Environment Variables
## Nagrik Setu v2.0

Copy this to `.env.local` (Next.js) and `agents/.env` (Python agents).
Never commit either file. Both are in `.gitignore`.

---

## Next.js — `.env.local`

```env
# ─── Supabase ───────────────────────────────────────────
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role — only used in Next.js API routes (server-side only, never NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Band ───────────────────────────────────────────────
# Get from: band.ai → Your Agents → each agent's settings
# These are used by Next.js API routes to trigger agents via Band HTTP API
BAND_API_BASE_URL=https://api.band.ai

# Vision Agent
BAND_VISION_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Routing Agent  
BAND_ROUTING_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Verification Agent
BAND_VERIFICATION_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Python Agents — `agents/.env`

```env
# ─── Supabase ───────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Gemini ─────────────────────────────────────────────
# Get from: Google AI Studio → Get API Key (free)
GEMINI_API_KEY=AIzaSy...

# ─── Band Agent Credentials ─────────────────────────────
# Get from: band.ai → register each agent → copy agent_id + api_key

# Vision Agent
BAND_VISION_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BAND_VISION_API_KEY=band_sk_...

# Routing Agent
BAND_ROUTING_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BAND_ROUTING_API_KEY=band_sk_...

# Watchdog Agent
BAND_WATCHDOG_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BAND_WATCHDOG_API_KEY=band_sk_...

# Verification Agent
BAND_VERIFICATION_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BAND_VERIFICATION_API_KEY=band_sk_...
```

---

## Railway Environment Variables

When deploying to Railway, add ALL of the above variables in:
Railway Dashboard → Your Service → Variables

For the Next.js service: add all variables from `.env.local`
For the Python agents service: add all variables from `agents/.env`

---

## Where to get each key

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role secret |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key |
| `BAND_*_AGENT_ID` | band.ai → Agents → New Agent → External Agent → copy UUID |
| `BAND_*_API_KEY` | band.ai → Agents → your agent → API Key |

---

## .gitignore entries (add these)

```
.env.local
agents/.env
agents/venv/
__pycache__/
*.pyc
.next/
node_modules/
```
