-- Política de senha do admin (estende 004_create_admin_users.sql):
--   1) marca de troca obrigatória (primeiro login e após reset);
--   2) fila de pedidos de "Esqueci minha senha".
--
-- Contexto: ADMIN_DEFAULT_PASSWORD ("mudarsenha123") estava commitada no
-- wrangler.toml e segue no histórico do git. Na aplicação desta migration, 9
-- dos 11 admins ainda usavam essa senha — ou seja, qualquer pessoa com acesso
-- ao repositório podia entrar como eles. O UPDATE abaixo força a troca deles.

ALTER TABLE admin_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

-- Pedidos de redefinição. Não guarda token nem senha: o super admin resolve o
-- pedido gerando uma senha temporária aleatória, entregue por fora (WhatsApp).
-- Registrar o pedido é o que permite a tela de "Esqueci minha senha" responder
-- sempre a mesma coisa, sem revelar se o e-mail é de um admin (enumeração).
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  handled_at INTEGER,
  handled_by TEXT
);

-- Fila aberta = handled_at IS NULL. Índice serve a essa consulta.
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_open
  ON password_reset_requests (handled_at, requested_at);

-- SHA-256 de "mudarsenha123" com pepper vazio — o esquema em uso hoje.
-- Datas em epoch de milissegundos, como o resto da tabela (Date.now()).
UPDATE admin_users
SET must_change_password = 1,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE password_hash = '53cf34ef510782dac13efac0fe695d2a7e8a51d69bf93b4e9242e110aee4ac3d';
