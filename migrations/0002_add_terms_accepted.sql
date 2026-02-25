-- Add terms acceptance timestamp to registrations (run on existing DBs)
ALTER TABLE registrations ADD COLUMN terms_accepted_at TEXT;
