-- Papel da conta: peregrino, servo (staff) e admin.
--
-- Por que na conta e não em `admin_users`: `admin_users` é a lista de quem abre
-- o painel, e continua sendo. Isto aqui responde outra pergunta — "quem é esta
-- pessoa no evento?" —, que vale para gente que nunca vai abrir o painel. Um
-- servo que só ajuda na portaria precisa ser reconhecido como servo sem ganhar
-- acesso a dado pessoal de 700 pessoas.
--
-- ⚠️ MARCAR NÃO ABRE PORTA. `is_admin = 1` aqui NÃO libera `/admin`: o painel
-- continua exigindo conta em `admin_users` e o JWT de admin. Fosse diferente,
-- esta migration viraria uma escalada de privilégio silenciosa em cima de uma
-- tabela que nasceu para peregrino. A unificação dos dois logins é uma frente
-- própria (Planning.md, bloco 1).
--
-- REGRA: todo admin é staff. Quem grava é obrigado a manter isso — ver
-- `functions/api/admin/accounts.ts`, que força `is_staff = 1` junto com
-- `is_admin = 1` e recusa tirar o staff de quem é admin.

ALTER TABLE users ADD COLUMN is_staff INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- Auditoria de quem mexeu no papel de quem. Sem isto, "quem me tornou admin?"
-- não tem resposta — e papel concedido é exatamente o que se quer auditar.
ALTER TABLE users ADD COLUMN role_updated_at INTEGER;
ALTER TABLE users ADD COLUMN role_updated_by TEXT;

-- Marca que a pessoa já foi CONVIDADA a preencher o cadastro no primeiro
-- acesso, tenha ela preenchido ou clicado em "preencher depois". Sem isto, quem
-- pula veria o mesmo formulário em todo login — que é a forma mais rápida de
-- ensinar alguém a ignorar a tela.
ALTER TABLE users ADD COLUMN profile_prompted_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_is_staff ON users (is_staff) WHERE is_staff = 1;
