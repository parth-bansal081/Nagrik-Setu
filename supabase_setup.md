# Supabase SQL Setup

Run the following SQL commands in your Supabase SQL Editor in the order they are presented.

---

## Step 1: Enable PostGIS Extension

Before creating tables with spatial coordinates, enable the PostGIS extension:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## Step 2: Create `grievances` Table

This table stores all the citizen complaints, AI analysis, routing information, and resolution status.

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

## Step 3: Create `grievance_history` Table

This table logs every status change, escalation, and agent action for audit trails.

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

## Step 4: Create Indexes for Performance

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

## Step 5: Create Auto-update Trigger for `updated_at`

This function and trigger automatically update the `updated_at` column whenever a grievance record is modified.

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

## Step 6: Create Auto-populate Trigger for PostGIS `location`

This function and trigger automatically populate the `location` PostGIS geography column based on the latitude and longitude parameters.

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

---

## Step 7: Create Spatial Deduplication Function (RPC)

This function is called by the Next.js API routes to check if there is an open grievance of the same category within 100 meters.

```sql
CREATE OR REPLACE FUNCTION check_spatial_duplicate(
  p_category TEXT,
  p_longitude DOUBLE PRECISION,
  p_latitude DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  grievance_id TEXT,
  citizen_name TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.grievance_id, g.citizen_name, g.status
  FROM grievances g
  WHERE g.category = p_category
    AND g.status NOT IN ('RESOLVED', 'REJECTED')
    AND g.is_duplicate = FALSE
    AND ST_DWithin(
      g.location::geography,
      ST_MakePoint(p_longitude, p_latitude)::geography,
      100
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

---

## Step 8: Create Leaderboard Stats Function (RPC)

This function aggregates performance metrics for the four departments to display on the leaderboard.

```sql
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS TABLE (
  department_id TEXT,
  department_name TEXT,
  total BIGINT,
  resolved BIGINT,
  escalated BIGINT,
  avg_resolution_hours DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.department_id,
    g.department_name,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE g.status = 'RESOLVED')::BIGINT AS resolved,
    COUNT(*) FILTER (WHERE g.escalation_level > 0)::BIGINT AS escalated,
    COALESCE(AVG(EXTRACT(EPOCH FROM (g.resolved_at - g.created_at)) / 3600) FILTER (WHERE g.status = 'RESOLVED'), 0)::DOUBLE PRECISION AS avg_resolution_hours
  FROM grievances g
  WHERE g.department_id IS NOT NULL
  GROUP BY g.department_id, g.department_name
  ORDER BY COALESCE((COUNT(*) FILTER (WHERE g.status = 'RESOLVED'))::float / NULLIF(COUNT(*), 0), 0) DESC;
END;
$$ LANGUAGE plpgsql;
```

```

```
