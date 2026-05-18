-- Migration: allow duplicate emails in registrations
-- IMPORTANT: run after 003_add_registration_number.sql

CREATE TABLE registrations__new (
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
  cpf_encrypted TEXT,
  date_of_birth TEXT,
  terms_accepted_at TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  has_allergy_medication INTEGER NOT NULL DEFAULT 0,
  allergy_medication_details TEXT,
  has_dietary_restriction INTEGER NOT NULL DEFAULT 0,
  dietary_restriction_details TEXT,
  registration_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

INSERT INTO registrations__new (
  id,
  email,
  name,
  status,
  payment_provider,
  payment_ref,
  sleep_at_monastery,
  companion_name,
  phone,
  cep,
  address,
  number,
  complement,
  city,
  state,
  cpf_encrypted,
  date_of_birth,
  terms_accepted_at,
  emergency_contact_name,
  emergency_contact_phone,
  has_allergy_medication,
  allergy_medication_details,
  has_dietary_restriction,
  dietary_restriction_details,
  registration_number,
  created_at,
  paid_at
)
SELECT
  id,
  email,
  name,
  status,
  payment_provider,
  payment_ref,
  sleep_at_monastery,
  companion_name,
  phone,
  cep,
  address,
  number,
  complement,
  city,
  state,
  cpf_encrypted,
  date_of_birth,
  terms_accepted_at,
  emergency_contact_name,
  emergency_contact_phone,
  has_allergy_medication,
  allergy_medication_details,
  has_dietary_restriction,
  dietary_restriction_details,
  registration_number,
  created_at,
  paid_at
FROM registrations;

DROP TABLE registrations;
ALTER TABLE registrations__new RENAME TO registrations;

CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_ref ON registrations(payment_ref);
CREATE INDEX IF NOT EXISTS idx_registrations_status_sleep ON registrations(status, sleep_at_monastery);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_cpf_encrypted
  ON registrations(cpf_encrypted)
  WHERE cpf_encrypted IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_number
  ON registrations(registration_number)
  WHERE registration_number IS NOT NULL;
