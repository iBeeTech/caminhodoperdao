-- Convidar para Grupo WP: rastreia o convite ao grupo do WhatsApp por inscrição paga.
--   group_invited_at        = convidado (mensagem enviada ou marcado manualmente)
--   group_invite_failed_at  = tentou mas não conseguiu (número errado, não entregue)
--   ambos NULL              = aguardando
-- Estados mutuamente exclusivos, espelhando notified_at/contact_failed_at da lista de espera.
ALTER TABLE registrations ADD COLUMN group_invited_at TEXT;
ALTER TABLE registrations ADD COLUMN group_invite_failed_at TEXT;
