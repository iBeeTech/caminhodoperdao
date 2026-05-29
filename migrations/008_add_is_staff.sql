-- Migration: Add is_staff flag for free staff (cortesia) registrations
-- Date: 2026-05-29

ALTER TABLE registrations ADD COLUMN is_staff INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_registrations_is_staff ON registrations(is_staff);
