-- Troca geral -> pernoite: rastreia a cobrança PIX da DIFERENÇA de valor.
-- Quando preenchida, existe um PIX pendente cujo pagamento deve promover a
-- inscrição para pernoite (sleep_at_monastery = 1), sem alterar o status PAID
-- que a inscrição geral já possui. O webhook limpa a coluna ao confirmar.
ALTER TABLE registrations ADD COLUMN monastery_upgrade_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_monastery_upgrade_ref
  ON registrations(monastery_upgrade_ref);
