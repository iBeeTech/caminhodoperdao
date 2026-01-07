# Caminho do Perdão — Pages + D1

Monólito em Cloudflare Pages com frontend React (CRA), Pages Functions e banco D1 para inscrição de peregrinos com pagamento PIX (mock) e webhook.

## Build e deploy
- Build command: `npm ci && npm run build`
- Output directory: `build`
- Cloudflare Pages:
	- Conecte o repositório ao Pages.
	- Em "Build settings", configure o comando acima e o output `build`.
	- Ative Pages Functions (pasta `/functions`).

## Bindings e secrets
- D1 binding: adicione um binding chamado `DB` apontando para o banco D1 escolhido.
- Secrets (Pages → Settings → Environment variables):
	- `GATEWAY_API_KEY` (para futura integração real do gateway PIX; hoje é mock).
	- `WEBHOOK_SECRET` (usado para validar o webhook stub). Mantenha igual no provedor do webhook ou no simulador.

## Banco (D1)
1. Crie o banco D1 (`wrangler d1 create <DB_NAME>` caso use CLI).
2. Aplique o schema:
	 ```bash
	 wrangler d1 execute <DB_NAME> --file=./schema.sql
	 ```
3. Tabela principal: `registrations` (chave por email, status PENDING/PAID/CANCELED, refs de pagamento e timestamps).

## Rodar local
- Instale deps: `npm ci`
- Dev com Pages + Functions + D1 local:
	```bash
	wrangler pages dev --d1=DB=<DB_NAME_OR_PATH>
	```
	(use um banco local criado via `wrangler d1 execute`).
- Apenas frontend (CRA): `npm start` (não expõe as Functions; útil para UI rápida).

## Endpoints (Pages Functions)
- `POST /api/register` — cria inscrição PENDING e retorna PIX (mock). Trata duplicidade por email (409).
- `GET /api/status?email=` — retorna `{ exists, status, created_at, paid_at }`.
- `POST /api/reissue` — reemite cobrança se PENDING.
- `POST /api/webhooks/pix` — atualiza para PAID quando assinatura (header `x-webhook-signature`) bate com `WEBHOOK_SECRET`.

## Frontend
- Formulário na Landing: nome + email, chama `/api/register`.
- Se 409: chama `/api/status` e mostra mensagem para PAID ou PENDING, com opção de reemitir (`/api/reissue`).
- PIX copia-e-cola exibido em tela; botão “Já paguei” reconsulta status.
- SPA routing: arquivo `public/_redirects` com `/* /index.html 200` para evitar 404 em refresh.

## Testes
- Testes de UI (CRA): `npm test`
- Testes das Functions (Vitest): `npm run test:functions`
	- Inclui casos mínimos para fluxo de registro, duplicidade e webhook PAID (com mocks de D1 e PIX adapter).

## Próximos passos
- Substituir o mock de PIX por gateway real usando `GATEWAY_API_KEY`.
- Ajustar validação/observabilidade conforme formato de webhook do gateway escolhido.
