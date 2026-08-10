-- Link do pedido de fotos guardado para a organização reenviar.
--
-- Contexto: photo_order (migration 036) guarda só o HASH do token, e o valor em
-- claro sai UMA vez, no e-mail de "pedido aberto". Quando esse e-mail some (caixa
-- de spam, endereço errado, pessoa apagou), nem o admin conseguia reemitir — e
-- isso aconteceu na prática com um comprador de 2026.
--
-- ⚠️ Aqui o token fica EM TEXTO, de propósito. É uma troca consciente: o hash
-- em photo_order continua sendo o que autentica o download, e esta tabela existe
-- só para o admin conseguir mandar o endereço de novo. O preço é que um vazamento
-- do banco expõe os links dos pedidos que passaram por reemissão — aceitável
-- porque o que se protege é foto de evento público, e o alternativo (comprador
-- pagou e nunca recebe o arquivo) é pior.
--
-- Uma linha por pedido, e não histórico: reemitir troca o access_token_hash em
-- photo_order, então o token anterior morre no mesmo instante. Guardar os
-- antigos seria guardar lixo que não abre nada.
CREATE TABLE IF NOT EXISTS photo_order_link (
  order_id TEXT PRIMARY KEY REFERENCES photo_order(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- E-mail do admin que reemitiu, para saber a quem perguntar depois.
  created_by TEXT
);
