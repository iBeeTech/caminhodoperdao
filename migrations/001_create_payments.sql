-- Migration: Create payments table for Woovi/OpenPix PIX charges
-- Created: 2026-01-08

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  correlation_id TEXT NOT NULL UNIQUE,
  provider_charge_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'expired', 'error')),
  brcode TEXT,
  qr_code_image TEXT,
  qr_code_url TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index para buscar pagamentos por email
CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);

-- Index para buscar por correlation ID (idempotência)
CREATE INDEX IF NOT EXISTS idx_payments_correlation_id ON payments(correlation_id);

-- Index para buscar por provider charge ID
CREATE INDEX IF NOT EXISTS idx_payments_provider_charge_id ON payments(provider_charge_id);

-- Index para consultar pagamentos por status e data
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at DESC);

-- Index composto para buscar pagamentos ativos/pendentes por email
CREATE INDEX IF NOT EXISTS idx_payments_email_status ON payments(email, status) 
WHERE status IN ('created', 'pending');
