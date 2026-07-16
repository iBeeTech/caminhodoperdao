-- 1) Sexo do inscrito (estende registrations).
-- Nulo nos ~639 já cadastrados: só quem se inscrever daqui pra frente informa,
-- e as planilhas mostram "-" para os antigos. Sem CHECK: o SQLite não valida
-- CHECK adicionado por ALTER, então a validação de verdade fica nos endpoints
-- (functions/api/register.ts e functions/api/staff/register.ts).
-- Valores: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'.
ALTER TABLE registrations ADD COLUMN gender TEXT;

-- 2) Chave PIX para devolver o dinheiro (estende 011_create_refund_requests).
-- Informada por quem cancela algo já pago; aparece em /admin/estorno. Nula nos
-- estornos antigos e quando a pessoa preferir não informar na hora.
ALTER TABLE refund_requests ADD COLUMN pix_key TEXT;
