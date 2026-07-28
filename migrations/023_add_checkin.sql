-- Migration: credenciamento presencial (baixa de chegada / pulseira)
-- Date: 2026-07-28
--
-- No dia do evento mais de uma pessoa credencia ao mesmo tempo. A baixa é
-- registrada aqui: NULL = ainda não credenciado. checked_in_by guarda o e-mail
-- do admin que deu a baixa (vem do JWT, nunca do corpo da requisição), para a
-- tela poder responder "já credenciado por fulano às 07:42" em vez de fingir
-- sucesso quando dois celulares clicam no mesmo nome.
--
-- Colunas nullable e sem default: nada do que já existe lê estas colunas.
ALTER TABLE registrations ADD COLUMN checked_in_at TEXT;
ALTER TABLE registrations ADD COLUMN checked_in_by TEXT;
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at ON registrations(checked_in_at);
