-- Pernoite concedida (overrule do admin): inscrito que pagou como geral
-- (sleep_at_monastery = 0) e foi autorizado manualmente a dormir no mosteiro.
-- Ao conceder, o admin vira sleep_at_monastery = 1 E marca pernoite_granted = 1.
-- A flag distingue, no /admin/inscritos e nos relatórios, quem ganhou pernoite
-- por concessão de quem já se inscreveu com pernoite. Revogar volta as duas a 0.
-- Não passa pela checagem de capacidade — é justamente um override.
ALTER TABLE registrations ADD COLUMN pernoite_granted INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registrations_pernoite_granted
  ON registrations(pernoite_granted);
