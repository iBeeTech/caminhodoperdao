-- Chave PIX de estorno, na conta.
--
-- Já existe `refund_requests.pix_key` (migration 022), mas ela é preenchida NA
-- HORA do cancelamento — tarde demais para dois casos:
--
-- 1. **Estorno.** Hoje a pessoa só informa a chave quando cancela. Quem cancela
--    às pressas erra a digitação, e o admin descobre isso na hora de devolver o
--    dinheiro, por fora, no WhatsApp.
-- 2. **Troca de inscrição** (Planning.md, bloco 8). Quando A passa a vaga para
--    B, quem pagou foi A — e o "PIX para estorno" da inscrição passaria a ser o
--    de B. Ter a chave na CONTA de cada um é o que permite ao admin saber para
--    quem devolver sem depender de memória de conversa.
--
-- `refund_requests.pix_key` continua existindo e continua mandando na hora do
-- estorno: esta aqui é o padrão que preenche aquela, não a substitui.
ALTER TABLE users ADD COLUMN refund_pix_key TEXT;

-- 'cpf' | 'celular' | 'email' | 'aleatoria'. Guardar o tipo evita o admin ter
-- de adivinhar se "11987654321" é celular ou CPF mal digitado.
ALTER TABLE users ADD COLUMN refund_pix_type TEXT;
