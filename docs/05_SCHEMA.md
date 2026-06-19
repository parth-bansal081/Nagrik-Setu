# Database Schema
## Nagrik Setu v2.0 — Supabase (Postgres + PostGIS)

---

## Setup: Enable PostGIS

Run in Supabase SQL Editor first:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## Table 1: `grievances`

```sql
CREATE TABLE grievances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id      TEXT UNIQUE NOT NULL,         -- human-readable: GRV-2026-XXXXXXXX
  
  -- Citizen info
  citizen_name      TEXT NOT NULL,
  citizen_phone     TEXT NOT NULL,
  
  -- Location
  latitude          DECIMAL(10, 7) NOT NULL,
  longitude         DECIMAL(10, 7) NOT NULL,
  location          GEOGRAPHY(POINT, 4326),       -- PostGIS point for spatial queries
  
  -- Complaint details
  category          TEXT NOT NULL CHECK (category IN ('Roads', 'Water Supply', 'Electricity', 'Others')),
  description       TEXT NOT NULL,
  image_url         TEXT,                          -- Supabase Storage URL
  
  -- AI Analysis (populated by Vision Agent)
  ai_category       TEXT,
  ai_severity       TEXT CHECK (ai_severity IN ('Low', 'Medium', 'High')),
  ai_confidence     DECIMAL(3, 2),
  ai_summary        TEXT,
  
  -- Routing (populated by Routing Agent)
  department_id     TEXT CHECK (department_id IN ('PWD', 'JAL_SHAKTI', 'DISCOM', 'GENERAL')),
  department_name   TEXT,
  deadline          TIMESTAMPTZ,
  
  -- Status
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                      'PENDING', 'AI_VERIFIED', 'ROUTED',
                      'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'
                    )),
  
  -- Priority & Escalation
  is_high_priority  BOOLEAN DEFAULT FALSE,
  escalation_level  INTEGER DEFAULT 0,
  citizen_mood      TEXT CHECK (citizen_mood IN ('frustrated', 'unhappy', 'patient')),
  
  -- Deduplication
  master_ticket_id  UUID REFERENCES grievances(id),   -- NULL if this IS the master
  is_duplicate      BOOLEAN DEFAULT FALSE,
  
  -- Resolution (populated by Verification Agent)
  after_image_url   TEXT,
  resolution_lat    DECIMAL(10, 7),
  resolution_lng    DECIMAL(10, 7),
  location_verified BOOLEAN DEFAULT FALSE,
  resolved_at       TIMESTAMPTZ,
  
  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table 2: `grievance_history`

Audit log — every status change, escalation, agent action.

```sql
CREATE TABLE grievance_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id    UUID NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,        -- 'SUBMITTED', 'AI_VERIFIED', 'ROUTED', 'ESCALATED', 'RESOLVED', etc.
  actor           TEXT NOT NULL,        -- 'CITIZEN', 'VISION_AGENT', 'ROUTING_AGENT', 'WATCHDOG_AGENT', 'VERIFICATION_AGENT', 'ADMIN'
  metadata        JSONB,                -- any additional data for this event
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Indexes

```sql
-- Fast UUID lookup
CREATE INDEX idx_grievances_grievance_id ON grievances(grievance_id);

-- Spatial index for 100m dedup query
CREATE INDEX idx_grievances_location ON grievances USING GIST(location);

-- Filter by status (admin dashboard)
CREATE INDEX idx_grievances_status ON grievances(status);

-- Filter by department (admin dashboard)
CREATE INDEX idx_grievances_department ON grievances(department_id);

-- Watchdog query (overdue tickets)
CREATE INDEX idx_grievances_deadline ON grievances(deadline) WHERE status NOT IN ('RESOLVED', 'REJECTED');

-- History lookup
CREATE INDEX idx_history_grievance_id ON grievance_history(grievance_id);
```

---

## Trigger: Auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grievances_updated_at
  BEFORE UPDATE ON grievances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Trigger: Auto-populate PostGIS `location` from lat/lng

```sql
CREATE OR REPLACE FUNCTION set_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grievances_set_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON grievances
  FOR EACH ROW EXECUTE FUNCTION set_location_from_coords();
```

---

## Key Queries

### 1. Spatial Dedup — Find open ticket within 100m

```sql
SELECT id, grievance_id, citizen_name, status
FROM grievances
WHERE category = $1
  AND status NOT IN ('RESOLVED', 'REJECTED')
  AND is_duplicate = FALSE
  AND ST_DWithin(
    location::geography,
    ST_MakePoint($2, $3)::geography,
    100
  )
LIMIT 1;
```

### 2. Watchdog — Find overdue tickets

```sql
SELECT id, grievance_id, department_id, escalation_level, deadline
FROM grievances
WHERE status IN ('ROUTED', 'IN_PROGRESS')
  AND deadline < NOW()
ORDER BY deadline ASC;
```

### 3. Leaderboard aggregation

```sql
SELECT
  department_id,
  department_name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
  COUNT(*) FILTER (WHERE escalation_level > 0) AS escalated,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
    FILTER (WHERE status = 'RESOLVED') AS avg_resolution_hours
FROM grievances
WHERE department_id IS NOT NULL
GROUP BY department_id, department_name
ORDER BY resolved::float / NULLIF(total, 0) DESC;
```

### 4. Admin dashboard — All grievances with filters

```sql
SELECT *
FROM grievances
WHERE
  ($1::text IS NULL OR department_id = $1)
  AND ($2::text IS NULL OR status = $2)
ORDER BY
  is_high_priority DESC,
  escalation_level DESC,
  created_at DESC;
```

---

## Supabase Storage

Bucket: `grievance-images`
- Path for before photos: `before/{grievance_id}.jpg`
- Path for after photos: `after/{grievance_id}.jpg`
- Public read access (for display in dashboard)
- Upload via Supabase Storage SDK from Next.js API routes
