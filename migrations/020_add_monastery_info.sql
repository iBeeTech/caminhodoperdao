-- Informar regras do Mosteiro: rastreia o envio da mensagem de regras da
-- hospedagem para quem vai dormir no mosteiro (sleep_at_monastery = 1).
--   monastery_info_sent_at    = informado (mensagem enviada ou marcado manualmente)
--   monastery_info_failed_at  = tentou mas não conseguiu (número errado, não entregue)
--   ambos NULL                = aguardando
-- Estados mutuamente exclusivos, espelhando group_invited_at/group_invite_failed_at.
ALTER TABLE registrations ADD COLUMN monastery_info_sent_at TEXT;
ALTER TABLE registrations ADD COLUMN monastery_info_failed_at TEXT;
