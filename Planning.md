# Planning — depois do evento de 2026

Duas frentes decididas em 16/07/2026, **adiadas de propósito** para depois do
evento: mexer em login e credenciamento com a inscrição aberta arrisca o que já
está funcionando. Este documento existe para a decisão não se perder.

Nada aqui está implementado.

---

## 1. Login por pessoa (perfil + histórico)

### Objetivo

Hoje o peregrino se identifica **pelo CPF**, sem senha: digita o CPF em
"consultar inscrição" e vê/cancela a própria inscrição. Não existe conta, não
existe histórico entre edições, e quem souber o CPF de alguém acessa a
inscrição dessa pessoa.

Com login, cada pessoa passa a ter perfil e histórico ("participei em 2025 e
2026"), e o acesso deixa de depender de um número que não é segredo.

### O que já existe (base para reaproveitar)

- `admin_users` + `functions/_utils/adminAuth.ts`: JWT (HS256), hash de senha,
  `authorizeAdminRequest`, marca `must_change_password`. O fluxo de senha
  temporária/troca obrigatória feito em 2026 serve de molde.
- `registrations`: já tem `email`, `cpf_encrypted`, `phone`, `date_of_birth`.
- `src/utils/auth/adminSession.ts`: store de token observável no front.

### Decisões a tomar antes de codar

- **Chave de identidade:** e-mail ou CPF? O CPF se repete entre edições e já
  está no banco (criptografado); o e-mail é o que a pessoa lembra. Provável:
  e-mail como login, CPF como vínculo com as inscrições antigas.
- **Como a pessoa entra na primeira vez?** Sem provedor de e-mail (ver
  "Bloqueio" abaixo), não há link mágico nem "esqueci minha senha" automático.
- **Migração dos inscritos existentes:** ~639 de 2026, mais os de 2025. Criar
  contas em massa sem conseguir avisar por e-mail não funciona; provavelmente a
  conta nasce no próximo cadastro e "adota" o histórico pelo CPF.
- **LGPD:** conta com histórico muda a conversa sobre retenção e exclusão de
  dados. Vale revisar os termos.

### Bloqueio conhecido

**Não existe envio de e-mail no projeto.** Verificado em 16/07/2026: nenhum
Resend/SendGrid/MailChannels. O Cloudflare Email Workers só *recebe*; o
MailChannels encerrou o tier grátis para Workers. Sem isso não há confirmação
de cadastro, link mágico nem recuperação de senha — e login sem recuperação de
senha vira suporte manual no WhatsApp para centenas de pessoas.

**Resolver isto primeiro.** Recomendação: Resend (3.000 e-mails/mês grátis,
domínio já no Cloudflare, DNS simples). Exige conta, verificação de domínio
(SPF/DKIM) e a API key como *secret* do Pages — nunca como var no
`wrangler.toml`.

### Dívida a limpar junto

O hash de senha é **SHA-256 com pepper, sem sal e sem KDF** (`hashPassword` em
`functions/_utils/adminAuth.ts`), e o pepper está vazio em produção. Aguenta 11
admins; **não serve** para centenas de contas de peregrinos. Migrar para PBKDF2
(nativo no WebCrypto) ou Argon2 antes de abrir login ao público. Trocar o
esquema exige re-hash — o momento natural é quando as senhas nascerem do zero.

---

## 2. Credenciamento por QR code individual

### Objetivo

Substituir a conferência por lista impressa/planilha na chegada. Cada inscrito
recebe um QR code próprio; na portaria, ler o código confirma presença na hora.

### O que já existe (base para reaproveitar)

- `registration_number` em `registrations` (identificador por inscrição).
- Planilhas de credenciamento: `/api/admin/reports/credenciamento?tipo=peregrinos`
  e `?tipo=staff` — o fluxo em papel que isto substitui.
- O projeto **já gera e exibe QR code** no PIX (`qrCodeText` / `qrCodeImageUrl`
  em `src/pages/Landing/`), então há precedente de geração e renderização.

### Decisões a tomar antes de codar

- **O que vai dentro do QR:** nunca o CPF. Um token opaco por inscrição
  (aleatório, indexado), que não vaze dado pessoal se a foto do código vazar.
- **Como a pessoa recebe:** sem e-mail (ver bloqueio acima), sobra a tela do
  site ("minha inscrição") ou WhatsApp. Isso amarra esta frente à de login.
- **Leitor da portaria:** app no celular do staff? Precisa de tela de scan,
  autenticação de quem escaneia e registro de quem credenciou.
- **Offline:** e se o sinal cair no mosteiro? Provável necessidade de cache
  local + sincronização posterior. **Este é o maior risco do projeto** — a
  portaria não pode parar.
- **Reentrada e fraude:** o código pode ser usado duas vezes? Foto repassada a
  outra pessoa? Definir se o credenciamento é único ou idempotente.

### Esboço de schema (proposta, não aplicado)

```sql
ALTER TABLE registrations ADD COLUMN checkin_token TEXT;      -- opaco, aleatório
ALTER TABLE registrations ADD COLUMN checked_in_at INTEGER;   -- epoch ms
ALTER TABLE registrations ADD COLUMN checked_in_by TEXT;      -- quem escaneou
CREATE UNIQUE INDEX idx_registrations_checkin_token
  ON registrations (checkin_token);
```

---

## Ordem sugerida

1. **Provedor de e-mail** — destrava as duas frentes; sem ele, ambas viram
   suporte manual.
2. **Hash de senha (PBKDF2/Argon2)** — antes de existir conta de público.
3. **Login + perfil** — o histórico depende da identidade estar resolvida.
4. **QR code** — encaixa em "minha inscrição" e no envio, que já existirão.

## Contexto que não está no código

- O evento de 2026 tem ~639 inscritos pagos (~600 peregrinos + ~38 staff);
  teto de 500 peregrinos e 80 camas no mosteiro. Staff sem teto.
- O deploy é automático no push da `main` (CF Pages), mas **não roda
  migrations**: aplicar à mão com
  `wrangler d1 execute caminhodoperdao-db --env production --remote --file <arquivo>`.
- `tsconfig.json` usa `moduleResolution: "Bundler"` com `typescript` 4.9.5
  fixado: `tsc --noEmit` e `cypress run` estão quebrados. Vale destravar antes
  de encarar qualquer uma destas frentes — hoje não há type-check nem E2E
  segurando a rede.
