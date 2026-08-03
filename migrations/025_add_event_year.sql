-- Ano da edição em cada inscrição.
--
-- Hoje `registrations` não tem coluna de ano: as inscrições atuais são de 2026
-- apenas por `created_at`. Sem ano não existe histórico do peregrino, medalha
-- por edição, credenciamento por ano nem troca de inscrição — é pré-requisito
-- dos blocos 2, 4, 6 e 8 do Planning.md.
--
-- Backup de `registrations` (747 linhas) exportado em 03/08/2026 antes de
-- aplicar, para backups/ (ignorado pelo git: o repositório é público e o
-- arquivo tem dado pessoal dos inscritos).
--
-- ⚠️ ACHADO: schema.sql declara `cpf_encrypted TEXT UNIQUE`, mas o banco de
-- PRODUÇÃO não tem essa constraint — o CPF é único apenas pelo índice parcial
-- idx_registrations_cpf_encrypted. A diferença veio da migration 006, que
-- reconstruiu a tabela. Isso é uma boa notícia: constraint UNIQUE de coluna cria
-- um índice implícito IMPOSSÍVEL de derrubar em SQLite, e mudá-la exigiria
-- reconstruir a tabela inteira com 747 linhas e 11 índices. Como ela não existe
-- de fato, basta trocar o índice. schema.sql precisa ser corrigido à parte.

-- 1) A coluna. NOT NULL com default preenche as linhas existentes de uma vez.
--
-- ⚠️ O default NÃO é enfeite: num índice único de várias colunas, o SQLite
-- deixa de aplicar a unicidade na linha em que qualquer coluna é NULL. Coluna
-- anulável aqui significaria que uma inscrição gravada sem ano escaparia da
-- regra "1 CPF por edição" em silêncio.
--
-- ⚠️ ANTES DE ABRIR 2027: quem grava a inscrição passa a definir event_year
-- explicitamente (register.ts, a partir da env EVENT_YEAR). Este default fica
-- como rede, mas rede vencida — se o código esquecer, a inscrição de 2027 nasce
-- marcada como 2026 sem reclamar.
ALTER TABLE registrations ADD COLUMN event_year INTEGER NOT NULL DEFAULT 2026;

-- 2) A troca de índice — a parte perigosa.
--
-- O CPF era único GLOBAL. Mantido assim, ninguém consegue se inscrever no ano
-- seguinte: o segundo cadastro do mesmo CPF bateria no índice. A unicidade
-- passa a ser por (CPF, ano).
--
-- Recriar é seguro porque o índice antigo já garantia CPF único global, então
-- (cpf, 2026) também é único — a criação do novo não pode falhar por duplicata.
DROP INDEX IF EXISTS idx_registrations_cpf_encrypted;

CREATE UNIQUE INDEX idx_registrations_cpf_encrypted
  ON registrations (cpf_encrypted, event_year)
  WHERE cpf_encrypted IS NOT NULL;

-- 3) Índice de leitura: histórico e medalhas filtram por ano o tempo todo.
CREATE INDEX IF NOT EXISTS idx_registrations_event_year
  ON registrations (event_year);
