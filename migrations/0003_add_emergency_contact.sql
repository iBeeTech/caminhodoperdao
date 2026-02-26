-- Add emergency contact fields to registrations (run on existing DBs)
ALTER TABLE registrations ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE registrations ADD COLUMN emergency_contact_phone TEXT;
