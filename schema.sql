-- D1 schema for pilgrim registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','CANCELED')),
  payment_provider TEXT,
  payment_ref TEXT,
  sleep_at_monastery INTEGER NOT NULL DEFAULT 0,
  phone TEXT NOT NULL DEFAULT '',
  cep TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  complement TEXT,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_ref ON registrations(payment_ref);
CREATE INDEX IF NOT EXISTS idx_registrations_status_sleep ON registrations(status, sleep_at_monastery);

-- Example migration command (replace <DB_NAME>):
-- wrangler d1 execute <DB_NAME> --file=./schema.sql
