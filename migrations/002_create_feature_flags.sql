-- Migration: Create feature flags table
-- Created: 2026-01-08

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index para buscar feature flags por nome
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- Insert default feature flags
INSERT INTO feature_flags (id, name, enabled, description, created_at, updated_at)
VALUES (
  'enrollment-' || datetime('now'),
  'enrollment',
  true,
  'Controls whether enrollment journey is available (true: active journey, false: coming soon message)',
  cast(strftime('%s', 'now') as integer),
  cast(strftime('%s', 'now') as integer)
)
ON CONFLICT(name) DO UPDATE SET updated_at = cast(strftime('%s', 'now') as integer);
