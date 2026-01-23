-- D1 schema for pilgrim registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','CANCELED')),
  payment_provider TEXT,
  payment_ref TEXT,
  sleep_at_monastery INTEGER NOT NULL DEFAULT 0,
  companion_name TEXT,
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

-- D1 schema for testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Testimonials indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at DESC);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Example migration command (replace <DB_NAME>):
-- wrangler d1 execute <DB_NAME> --file=./schema.sql
