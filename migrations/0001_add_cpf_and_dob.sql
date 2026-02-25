-- Add CPF (encrypted) and date of birth to registrations (run on existing DBs)
ALTER TABLE registrations ADD COLUMN cpf_encrypted TEXT;
ALTER TABLE registrations ADD COLUMN date_of_birth TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_cpf_encrypted ON registrations(cpf_encrypted) WHERE cpf_encrypted IS NOT NULL;
