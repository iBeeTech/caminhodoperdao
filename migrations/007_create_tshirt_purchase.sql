-- Migration: Create tshirt_purchase table for Woovi PIX purchases
-- Created: 2026-05-28

CREATE TABLE IF NOT EXISTS tshirt_purchase (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_correlation_id ON tshirt_purchase(correlation_id);
CREATE INDEX IF NOT EXISTS idx_tshirt_purchase_provider_charge_id ON tshirt_purchase(provider_charge_id);
