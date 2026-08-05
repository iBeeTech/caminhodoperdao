-- Link de upload das fotos do evento, para entregar ao fotógrafo.
--
-- O fotógrafo NÃO é admin e não pode ter conta no painel: ele precisa mandar as
-- fotos uma vez e sumir. Por isso o acesso é um link com segredo e prazo, no
-- desenho já previsto no Planning.md (bloco 9).
--
-- ⚠️ O token é guardado como HASH (SHA-256), nunca em texto puro. O valor em
-- claro só existe no momento em que o admin gera o link e é mostrado UMA vez —
-- mesma postura que o projeto já toma com senha de admin. Se o banco vazar,
-- ninguém consegue subir arquivo com o que estiver aqui.
--
-- Três formas de o link morrer, e todas importam:
--   expires_at   -> prazo combinado (o "depois dessa data eu retiro" do pedido)
--   revoked_at   -> o admin mata na hora, se o link vazar antes do prazo
--   max_bytes    -> teto de volume, para um link vazado não virar hospedagem
--                   grátis de arquivo alheio na conta do projeto
CREATE TABLE IF NOT EXISTS photo_upload_links (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  -- Quem recebeu o link, escrito pelo admin ("Fotógrafo João / 2026").
  label TEXT NOT NULL,
  -- Ano da edição a que as fotos pertencem: vira o prefixo da chave no R2.
  event_year INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  -- Teto de bytes deste link. Somado a uploaded_bytes é o que corta o abuso.
  max_bytes INTEGER NOT NULL,
  uploaded_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_count INTEGER NOT NULL DEFAULT 0,
  last_upload_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_upload_links_expires ON photo_upload_links(expires_at);

-- Uma linha por foto recebida. Existe para (1) o admin ver o que chegou sem
-- precisar listar o balde e (2) o reenvio do mesmo arquivo não contar duas vezes
-- no teto — internet de fotógrafo cai, e reenviar é o normal, não a exceção.
CREATE TABLE IF NOT EXISTS photo_uploads (
  r2_key TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_type TEXT,
  event_year INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photo_uploads_link ON photo_uploads(link_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_year ON photo_uploads(event_year);
