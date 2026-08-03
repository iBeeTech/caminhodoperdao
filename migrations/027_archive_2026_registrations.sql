-- Arquiva as inscrições de 2026 em registrations_old.
--
-- Decidido em 03/08/2026. A inscrição sai do site público e passa a exigir
-- conta, e o admin precisa de `registrations` limpa para testar o fluxo novo.
--
-- ⚠️ ISTO DESLIGA O HISTÓRICO AUTOMÁTICO DE 2026. A coluna event_year
-- (migration 025) existe para vários anos conviverem na MESMA tabela, e é dela
-- que sairiam as medalhas. Arquivando, o perfil não tem de onde ler 2026.
-- A decisão consciente foi: **no primeiro login o peregrino declara em quais
-- anos participou**. O histórico passa a ser auto-declarado, não apurado — ou
-- seja, ninguém consegue provar nada, e a medalha vale o que a palavra da
-- pessoa valer. Aceito de propósito.
--
-- O que foi verificado antes de aplicar:
-- - backup completo em backups/ (747 linhas), fora do git;
-- - 1 estorno PENDENTE existe, mas `refund_requests` guarda nome, telefone,
--   e-mail, valor e chave PIX na própria linha e nunca consulta `registrations`
--   — o estorno sobrevive;
-- - `invite_codes.used_by_registration_id` passa a apontar para linhas que só
--   existem em registrations_old. É referência solta, não quebra consulta
--   (não há FOREIGN KEY), mas rastrear "quem usou este convite" exige olhar a
--   tabela arquivada.
--
-- registrations_old é ARQUIVO: sem índices, sem constraints, ninguém escreve
-- nela. Para consultar 2026 é SELECT direto.

-- 1) Cópia fiel, mesma estrutura de colunas.
CREATE TABLE IF NOT EXISTS registrations_old AS
  SELECT * FROM registrations WHERE event_year = 2026;

-- 2) Só depois de copiado, esvazia o ano na tabela viva.
--    Filtra por event_year em vez de apagar tudo: assim a instrução continua
--    correta caso já exista inscrição de outro ano quando isto rodar.
DELETE FROM registrations WHERE event_year = 2026;
