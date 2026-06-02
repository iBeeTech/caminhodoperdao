-- Migration: Adiciona e-mail do comprador na compra de camiseta
-- Usado para enviar o comprovante de pagamento (via Woovi) e para contato.
-- Created: 2026-06-02

ALTER TABLE tshirt_purchase ADD COLUMN email TEXT;
