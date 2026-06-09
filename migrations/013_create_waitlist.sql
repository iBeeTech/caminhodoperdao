-- Lista de espera: quando as inscrições lotam (totalFull), o peregrino deixa
-- nome + CPF + WhatsApp. Se abrir vaga, o admin avisa pelo WhatsApp por ordem
-- de entrada (created_at) e marca notified_at. CPF criptografado com a mesma
-- chave das inscrições; um CPF só entra uma vez (re-envio atualiza nome/telefone).
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_encrypted TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified_at ON waitlist(notified_at);
