-- Testemunhos (graças e milagres recebidos), diferente dos depoimentos.
-- Enviados pelo público em texto ou áudio (transcrito); só aparecem no site
-- depois de aprovados no admin (status = 'approved').
CREATE TABLE IF NOT EXISTS testimonies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'text' CHECK (source IN ('text', 'audio')),
  audio_key TEXT,
  audio_content_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_testimonies_status ON testimonies(status);
CREATE INDEX IF NOT EXISTS idx_testimonies_created_at ON testimonies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonies_audio_key ON testimonies(audio_key);
