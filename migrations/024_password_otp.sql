-- Código de uso único (OTP) para "esqueci minha senha" do admin.
--
-- Substitui o fluxo manual criado em 021_admin_password_policy.sql, no qual o
-- super admin gerava uma senha temporária e a ditava por WhatsApp. Duas coisas
-- mudam: (1) o envio passa a ser automático por e-mail (Resend, domínio
-- verificado em 03/08/2026), tirando a pessoa do meio; (2) o que viaja deixa de
-- ser uma credencial que loga e passa a ser um código que só autoriza trocar a
-- senha, uma vez, com validade de minutos.
--
-- A tabela password_reset_requests CONTINUA existindo e sendo alimentada: virou
-- trilha de auditoria (quem pediu, quando, e se foi resolvido), e é o que a tela
-- Admin/PedidosSenha lê. Ela deixa de ser fila de trabalho manual.

CREATE TABLE IF NOT EXISTS password_otp_challenges (
  -- Identificador opaco devolvido ao navegador. A validação é POR DESAFIO, não
  -- por e-mail: sem isso, quem soubesse um e-mail poderia disparar tentativas
  -- contra a conta a partir de qualquer pedido.
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,

  -- HMAC-SHA-256 do código (chave = ADMIN_JWT_SECRET). Nunca o código em texto,
  -- e nunca SHA-256 puro: 6 dígitos são 1 milhão de combinações, que um hash sem
  -- chave quebra offline em instantes se o banco vazar.
  code_hash TEXT NOT NULL,

  -- Tentativas erradas. Passou do teto, o desafio queima.
  attempts INTEGER NOT NULL DEFAULT 0,

  expires_at INTEGER NOT NULL,          -- epoch ms; validade do código

  -- Preenchidos quando o código é aceito: a autorização de trocar a senha é um
  -- segundo segredo, com validade própria, para o código não virar chave eterna.
  verified_at INTEGER,
  reset_token_hash TEXT,
  reset_expires_at INTEGER,

  used_at INTEGER,                      -- senha trocada; desafio morto

  -- Guardado para perícia (de onde partiu o pedido), não para limitar.
  request_ip TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_otp_email
  ON password_otp_challenges (email, created_at);

-- O limite de pedidos NÃO pode ser contado nesta tabela. Só existe desafio para
-- e-mail que é de admin de verdade, então contar aqui faria o limite disparar
-- para conta existente e nunca para inexistente — e a diferença de resposta
-- entregaria quais endereços são de admin, justo o que forgot-password evita.
--
-- A contagem vai em password_reset_requests, que recebe UMA LINHA POR PEDIDO,
-- exista o e-mail ou não. Por isso ela ganha o IP e os índices de janela.
ALTER TABLE password_reset_requests ADD COLUMN request_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_time
  ON password_reset_requests (email, requested_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_ip_time
  ON password_reset_requests (request_ip, requested_at);
