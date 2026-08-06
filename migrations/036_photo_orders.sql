-- Venda das fotos do evento (bloco 9 do Planning.md).
--
-- O peregrino escolhe as fotos na galeria, paga UM PIX com o total e recebe os
-- arquivos em alta. O molde é o mesmo de tshirt_purchase (migration 007):
-- PENDING -> PAID / CANCELED, casando pelo payment_ref que a Woovi devolve.
--
-- Duas tabelas, e não uma linha por foto com os dados do comprador repetidos:
-- o pagamento é do PEDIDO (um QR Code para o carrinho inteiro), enquanto o que
-- se entrega são as FOTOS. Guardar os dois juntos obrigaria a repetir nome,
-- e-mail e referência de cobrança em cada foto e abriria espaço para um pedido
-- ficar meio pago.
--
-- NÃO tem CPF de propósito. PIX não exige o CPF de quem paga, e a foto é
-- entregue por link no e-mail: guardar CPF aqui seria estocar dado sensível que
-- o fluxo não usa (o projeto já precisa criptografar CPF onde ele é inevitável,
-- ver cpfCrypto.ts).
CREATE TABLE IF NOT EXISTS photo_order (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  event_year INTEGER NOT NULL,
  -- Quantidade de fotos e valor total em centavos. O preço unitário vigente no
  -- momento da compra fica gravado: se o valor mudar, o pedido antigo continua
  -- contando a história certa.
  photo_count INTEGER NOT NULL CHECK (photo_count > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELED')),
  payment_provider TEXT NOT NULL DEFAULT 'woovi',
  payment_ref TEXT NOT NULL UNIQUE,
  correlation_id TEXT,
  provider_charge_id TEXT,
  qr_code_text TEXT,
  qr_code_image TEXT,
  -- Segredo que abre a página do pedido e os downloads. Guardado como HASH
  -- SHA-256, como o link do fotógrafo (migration 035): banco vazado não vira
  -- acesso às fotos compradas por outra pessoa.
  access_token_hash TEXT NOT NULL UNIQUE,
  -- Depois desta data os links param de funcionar. Quem perdeu o prazo fala com
  -- a organização, que reemite — em vez de o link valer para sempre.
  downloads_expire_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  delivery_email_sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_order_status ON photo_order(status);
CREATE INDEX IF NOT EXISTS idx_photo_order_email ON photo_order(email);
CREATE INDEX IF NOT EXISTS idx_photo_order_payment_ref ON photo_order(payment_ref);
CREATE INDEX IF NOT EXISTS idx_photo_order_correlation_id ON photo_order(correlation_id);
CREATE INDEX IF NOT EXISTS idx_photo_order_charge_id ON photo_order(provider_charge_id);

-- Uma linha por foto comprada. A chave primária composta impede a mesma foto
-- entrar duas vezes no mesmo pedido — o carrinho da tela também impede, mas o
-- banco é quem garante quando a requisição chega duplicada.
CREATE TABLE IF NOT EXISTS photo_order_item (
  order_id TEXT NOT NULL REFERENCES photo_order(id) ON DELETE CASCADE,
  photo_name TEXT NOT NULL,
  PRIMARY KEY (order_id, photo_name)
);

CREATE INDEX IF NOT EXISTS idx_photo_order_item_order ON photo_order_item(order_id);
