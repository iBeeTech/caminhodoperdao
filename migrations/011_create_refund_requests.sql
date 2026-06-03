-- Estorno: registra cancelamentos feitos PELO SITE que envolvem dinheiro a devolver
-- (inscrição paga cancelada, compra de camiseta paga cancelada, downgrade pernoite->geral).
-- Diferencia de quem só deixou o PIX expirar (esses não geram linha aqui).
-- Alimenta a página /admin/estorno (status do estorno controlado pelo admin).
CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('inscricao', 'camiseta', 'downgrade')),
  source_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (refund_status IN ('PENDENTE', 'FEITO', 'CANCELADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(refund_status);
-- Evita duplicar a mesma origem (ex.: webhook/cancelamento disparado mais de uma vez).
CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_type_source
  ON refund_requests(type, source_id);
