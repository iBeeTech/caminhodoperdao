-- Conta do peregrino.
--
-- Decidido em 03/08/2026: a inscrição sai do site público e passa a exigir
-- conta. O e-mail de login É o e-mail da inscrição, por construção.
--
-- Tabela SEPARADA de admin_users, de propósito. O "login unificado" do plano
-- original foi abandonado: unificar obrigaria a migrar os 11 admins e mexer no
-- fluxo de senha que acabou de ser estabilizado, sem ganho nenhum para o
-- peregrino. Admin e peregrino são públicos diferentes, com riscos diferentes.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,

  -- Sempre minúsculo. O índice único abaixo é o que impede duas contas com o
  -- mesmo e-mail; normalizar na aplicação sem isto deixaria passar
  -- "Joao@x.com" e "joao@x.com" como contas diferentes.
  email TEXT NOT NULL,

  -- Formato "pbkdf2$<iteracoes>$<salt>$<hash>", auto-descritivo de propósito:
  -- dá para aumentar as iterações depois sem invalidar as senhas já criadas.
  --
  -- ⚠️ NÃO usa o hashPassword de adminAuth.ts. Aquele é SHA-256 SEM SAL, com
  -- pepper vazio em produção — aguenta 11 admins, mas com centenas de contas de
  -- peregrino é rainbow-table direto. admin_users fica como está; o hash forte
  -- entra aqui, onde o volume justifica.
  password_hash TEXT NOT NULL,

  -- Confirmação do e-mail. Sem ela, um endereço digitado errado gera conta que
  -- nunca recebe nada — e agora é por e-mail que passam inscrição, QR code e
  -- troca. Enquanto for NULL, a conta não se inscreve.
  email_confirmed_at INTEGER,

  -- Código de confirmação, guardado como HMAC (mesma razão do OTP de senha:
  -- 6 dígitos são 1 milhão de combinações, que hash sem chave quebra offline).
  -- Fica na própria linha do usuário porque é propriedade da conta, não um
  -- desafio avulso — uma confirmação pendente por vez, por construção.
  confirm_code_hash TEXT,
  confirm_expires_at INTEGER,
  confirm_attempts INTEGER NOT NULL DEFAULT 0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Dono da inscrição. Nulo nas 747 de 2026 (arquivadas na migration 027) e em
-- toda inscrição manual do admin, que por definição não tem conta.
-- Por isso NÃO é NOT NULL: a maioria das linhas historicamente não tem dono.
ALTER TABLE registrations ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_user_id
  ON registrations (user_id);
