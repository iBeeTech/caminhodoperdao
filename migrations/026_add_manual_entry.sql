-- Inscrição feita à mão pelo admin, com dados mínimos.
--
-- Caso de uso: a inscrição sai do site público e passa a exigir conta (ver
-- Planning.md, correção de 03/08/2026). Quem não tem e-mail deve criar um — mas
-- sobra um punhado de pessoas que o admin inscreve pessoalmente, sabendo só
-- nome, telefone e se pagou.
--
-- ⚠️ POR QUE NA MESMA TABELA, E NÃO NUMA NOVA: a lotação é contada com
-- `SELECT COUNT(*) FROM registrations WHERE status IN ('PENDING','PAID')`.
-- Essas pessoas OCUPAM vaga (decidido em 03/08/2026 — só staff não ocupa).
-- Numa tabela separada elas ficariam invisíveis para a contagem, e o site
-- venderia vagas já ocupadas. O mesmo vale para a lista de credenciamento e
-- para todos os relatórios, que leem só de `registrations`.
--
-- O molde já existia: staffRegistration.ts grava direto como PAID com
-- payment_provider 'cortesia', sem passar pela Woovi. Aqui é 'manual'.

-- 1 = criada pelo admin com dados mínimos. Serve para os relatórios explicarem
-- por que a linha não tem e-mail nem CPF, em vez de parecer dado corrompido.
ALTER TABLE registrations ADD COLUMN manual_entry INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registrations_manual_entry
  ON registrations (manual_entry);
