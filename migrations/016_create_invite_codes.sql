-- Convites de inscrição extra (override do teto de 500). O admin gera um código por
-- pessoa e envia o link /convite. Quem tem código válido se inscreve SEM PERNOITE mesmo
-- com o geral esgotado. Uso único: ao ser consumido por uma inscrição, fica indisponível.
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  note TEXT,
  used_at TEXT,
  used_by_registration_id TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_used_at ON invite_codes(used_at);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_at ON invite_codes(created_at DESC);

-- Marca a inscrição criada por convite. Serve para (1) relatórios e, principalmente,
-- (2) blindar essas inscrições da varredura de lotação: enforceCapacity NÃO cancela
-- pendentes de convite quando o geral lota (a vaga extra foi autorizada de propósito).
ALTER TABLE registrations ADD COLUMN invite_code TEXT;
CREATE INDEX IF NOT EXISTS idx_registrations_invite_code ON registrations(invite_code);
