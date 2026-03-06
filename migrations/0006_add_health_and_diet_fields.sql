-- Add health and dietary fields to registrations (run on existing DBs)
ALTER TABLE registrations ADD COLUMN has_allergy_medication INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN allergy_medication_details TEXT;
ALTER TABLE registrations ADD COLUMN has_dietary_restriction INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN dietary_restriction_details TEXT;
