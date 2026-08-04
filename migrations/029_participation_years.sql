-- Anos em que o peregrino diz ter participado.
--
-- Existe porque as inscrições de 2026 foram arquivadas em registrations_old
-- (migration 027) e o histórico apurado deixou de existir. Decidido em
-- 03/08/2026: no primeiro acesso a pessoa declara em quais anos caminhou.
--
-- ⚠️ ISTO É AUTO-DECLARADO. Ninguém prova nada: a medalha vale o que a palavra
-- da pessoa valer. Aceito de propósito. `source` existe para o dia em que
-- houver inscrição de verdade no ano — aí o registro nasce como 'inscricao' e
-- passa a ter lastro, convivendo com os 'declarado' antigos sem confundir os
-- dois.

CREATE TABLE IF NOT EXISTS user_participation_years (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,

  -- 'declarado' = a pessoa afirmou; 'inscricao' = veio de inscrição paga.
  source TEXT NOT NULL DEFAULT 'declarado',

  created_at INTEGER NOT NULL,

  -- Chave composta: um ano por pessoa, sem duplicar. É o que torna a gravação
  -- idempotente e impede a medalha de contar duas vezes o mesmo ano.
  PRIMARY KEY (user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_participation_user
  ON user_participation_years (user_id);
