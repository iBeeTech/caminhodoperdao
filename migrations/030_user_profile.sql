-- Dados pessoais do peregrino, na própria conta.
--
-- Por que na conta e não na inscrição: a inscrição de 2026 foi arquivada
-- (migration 027) e a de 2027 ainda não existe. Se estes campos morassem só em
-- `registrations`, a pessoa não teria o que editar hoje — e, quando a inscrição
-- abrisse, teria de digitar tudo de novo, todo ano.
--
-- O contrato passa a ser: a CONTA guarda quem a pessoa é (nome, telefone,
-- endereço, contato de emergência, saúde); a INSCRIÇÃO guarda o que é daquela
-- edição (pernoite, acompanhante, pagamento, credenciamento). Quando a
-- inscrição na área logada existir, ela nasce preenchida a partir daqui.
--
-- ⚠️ O CPF é set-once pela API: entra uma vez e depois só o admin muda
-- (`/admin/passar-cpf`). É ele que liga a conta ao histórico e ao pagamento;
-- deixá-lo livre transformaria "editar perfil" em "assumir a inscrição de
-- outra pessoa".

ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;

-- Mesma criptografia de `registrations.cpf_encrypted` (AES-CBC com IV fixo),
-- de propósito: sendo determinística, o mesmo CPF gera o mesmo texto cifrado, e
-- é isso que permite casar conta e inscrição sem descriptografar nada.
ALTER TABLE users ADD COLUMN cpf_encrypted TEXT;

ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN date_of_birth TEXT;
ALTER TABLE users ADD COLUMN cep TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN number TEXT;
ALTER TABLE users ADD COLUMN complement TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE users ADD COLUMN has_allergy_medication INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN allergy_medication_details TEXT;
ALTER TABLE users ADD COLUMN has_dietary_restriction INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN dietary_restriction_details TEXT;

-- Marca que a pessoa JÁ PASSOU pela pergunta "em quais anos você caminhou?".
-- Preenchido mesmo quando ela não marca nenhum ano — senão quem respondeu
-- "nenhum" veria a mesma pergunta em todo login, para sempre.
ALTER TABLE users ADD COLUMN years_declared_at INTEGER;

-- Dois donos para o mesmo CPF é o cenário que quebra tudo depois: duas contas
-- reivindicando a mesma inscrição, o mesmo histórico e o mesmo pagamento.
-- NULL não colide com NULL no SQLite, então contas sem CPF convivem à vontade.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_encrypted
  ON users (cpf_encrypted) WHERE cpf_encrypted IS NOT NULL;
