-- Lista de espera: marca quem o admin TENTOU avisar mas não conseguiu contato
-- (WhatsApp não entregue, número errado, etc.). Distinto de notified_at (avisado com
-- sucesso) e de "aguardando" (nenhum dos dois). Permite filtrar esses casos na tela.
ALTER TABLE waitlist ADD COLUMN contact_failed_at TEXT;
