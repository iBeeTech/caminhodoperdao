-- Migration: Add registration_number column
-- Date: 2026-01-10

ALTER TABLE registrations ADD COLUMN registration_number TEXT UNIQUE;
CREATE INDEX idx_registration_number ON registrations(registration_number);
