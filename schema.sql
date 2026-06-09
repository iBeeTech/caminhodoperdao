-- D1 schema for pilgrim registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
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
  cpf_encrypted TEXT UNIQUE,
  date_of_birth TEXT,
  terms_accepted_at TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  has_allergy_medication INTEGER NOT NULL DEFAULT 0,
  allergy_medication_details TEXT,
  has_dietary_restriction INTEGER NOT NULL DEFAULT 0,
  dietary_restriction_details TEXT,
  is_staff INTEGER NOT NULL DEFAULT 0,
  -- Ref. da cobrança PIX da diferença na troca geral -> pernoite (ver migration 010).
  monastery_upgrade_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_ref ON registrations(payment_ref);
CREATE INDEX IF NOT EXISTS idx_registrations_status_sleep ON registrations(status, sleep_at_monastery);
CREATE INDEX IF NOT EXISTS idx_registrations_is_staff ON registrations(is_staff);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_cpf_encrypted ON registrations(cpf_encrypted) WHERE cpf_encrypted IS NOT NULL;

-- D1 schema for t-shirt purchases (Caminhada do Perdao)
CREATE TABLE IF NOT EXISTS tshirt_purchase (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT,
  cpf_encrypted TEXT NOT NULL,
  size_p_qty INTEGER NOT NULL DEFAULT 0 CHECK (size_p_qty >= 0),
  size_m_qty INTEGER NOT NULL DEFAULT 0 CHECK (size_m_qty >= 0),
  size_g_qty INTEGER NOT NULL DEFAULT 0 CHECK (size_g_qty >= 0),
  size_gg_qty INTEGER NOT NULL DEFAULT 0 CHECK (size_gg_qty >= 0),
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELED')),
  payment_provider TEXT NOT NULL DEFAULT 'woovi',
  payment_ref TEXT NOT NULL UNIQUE,
  correlation_id TEXT,
  provider_charge_id TEXT,
  qr_code_text TEXT,
  qr_code_image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_cpf_encrypted ON tshirt_purchase(cpf_encrypted);
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_status ON tshirt_purchase(status);
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_payment_ref ON tshirt_purchase(payment_ref);

-- Estorno: cancelamentos feitos pelo site que exigem devolução (ver migration 011).
CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('inscricao', 'camiseta', 'downgrade')),
  source_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (refund_status IN ('PENDENTE', 'FEITO', 'CANCELADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(refund_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_type_source
  ON refund_requests(type, source_id);
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_correlation_id ON tshirt_purchase(correlation_id);
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_provider_charge_id ON tshirt_purchase(provider_charge_id);

-- Lista de espera quando as inscrições lotam (ver migration 013). O admin avisa
-- pelo WhatsApp por ordem de entrada e marca notified_at.
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_encrypted TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified_at ON waitlist(notified_at);

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

-- WhatsApp round-robin counter
CREATE TABLE IF NOT EXISTS whatsapp_round_robin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  counter INTEGER NOT NULL DEFAULT 0
);

INSERT INTO whatsapp_round_robin (id, counter)
VALUES (1, 0)
ON CONFLICT(id) DO NOTHING;

-- Example migration command (replace <DB_NAME>):
-- wrangler d1 execute <DB_NAME> --file=./schema.sql
