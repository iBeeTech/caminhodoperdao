-- Convites: marca quando o admin copiou o link de um código (rastreabilidade de quais
-- já foram enviados). Vira o status "Link copiado" na tela enquanto o código ainda está
-- disponível (sem inscrição vinculada e não revogado).
ALTER TABLE invite_codes ADD COLUMN link_copied_at TEXT;
