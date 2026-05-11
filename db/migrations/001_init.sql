-- WebAudit Pro initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS scans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  url         TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued', -- queued|running|completed|failed
  modules     TEXT[] NOT NULL DEFAULT '{}',
  progress    INTEGER NOT NULL DEFAULT 0,     -- 0..100
  overall_score INTEGER,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_project ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

CREATE TABLE IF NOT EXISTS scan_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id     UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,                  -- performance|seo|security|...
  status      TEXT NOT NULL DEFAULT 'pending',-- pending|running|done|failed
  score       INTEGER,                        -- 0..100 when applicable
  risk        TEXT,                           -- low|medium|high|critical
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_insights JSONB,                          -- LLM-generated insights
  duration_ms INTEGER,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan ON scan_results(scan_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_results_module ON scan_results(scan_id, module);

CREATE TABLE IF NOT EXISTS monitors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  url          TEXT NOT NULL,
  cron         TEXT NOT NULL DEFAULT '0 */6 * * *',
  modules      TEXT[] NOT NULL DEFAULT '{performance,security,seo}',
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at  TIMESTAMPTZ,
  next_run_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_monitors_user ON monitors(user_id);

CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id  UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  scan_id     UUID REFERENCES scans(id) ON DELETE SET NULL,
  level       TEXT NOT NULL,                  -- info|warning|critical
  kind        TEXT NOT NULL,                  -- downtime|perf_regression|ssl_expiry|api_failure
  message     TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_monitor ON alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
