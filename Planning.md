# Planning — depois do evento de 2026

Frentes decididas em 16/07/2026, **adiadas de propósito** para depois do
evento: mexer em login, credenciamento e pagamento com a inscrição aberta
arrisca o que já está funcionando. Este documento existe para a decisão não se
perder.

**Nada aqui está implementado.** Os blocos de SQL são esboços para discussão,
não migrations prontas.

---

## 1. Login (admin + peregrino, unificado)

### Decisão

Um único login para todo mundo. O que separa admin de peregrino é uma **claim
de papel no JWT**: só o token com papel de admin abre `/admin`.

**Não criar contas para os inscritos agora.** Isso é feito depois do evento.

### Como é hoje

- O peregrino **não tem conta**: digita o CPF em "consultar inscrição" e vê ou
  cancela a própria inscrição. Quem souber o CPF de alguém acessa a inscrição
  dessa pessoa.
- O admin tem conta em `admin_users` (11 contas), com JWT HS256, troca
  obrigatória no primeiro acesso e senha temporária aleatória — o fluxo de
  senha feito em 2026 serve de molde.
- `authorizeAdminRequest` (`functions/_utils/adminAuth.ts`) já é o portão único
  dos 23 endpoints de admin e já sabe recusar token marcado (`mustChange`). É
  nele que a checagem de papel entra.

### Decisões a tomar antes de codar

- **Tabela única ou duas?** O pedido é "o mesmo login". Mais simples: uma tabela
  `users` com `role`, e `admin_users` migra para dentro dela. Alternativa:
  manter `admin_users` e criar `users`, com o login tentando as duas — mais
  fácil de começar, pior de manter.
- **Migração dos 11 admins:** se virar tabela única, os hashes atuais precisam
  vir junto (ou todos trocam a senha). Como a troca obrigatória já está ligada
  para 9 deles, dá para aproveitar a mesma onda.
- **Chave de identidade:** e-mail. O CPF liga a conta às inscrições antigas.
- **Primeiro acesso do peregrino:** sem provedor de e-mail (ver Bloqueios), não
  há link mágico nem "esqueci minha senha" automático.

### Esboço

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,              -- ver "Senha" abaixo
  role TEXT NOT NULL DEFAULT 'peregrino',   -- 'peregrino' | 'admin'
  cpf_encrypted TEXT,                       -- liga às inscrições existentes
  photo_key TEXT,                           -- ver bloco 5 (foto)
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,              -- epoch ms, como admin_users
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_users_cpf ON users (cpf_encrypted);
```

O JWT ganha `role`; `authorizeAdminRequest` passa a exigir `role === 'admin'`.

### Senha — trocar o algoritmo ANTES de abrir ao público

`hashPassword` é **SHA-256 com pepper, sem sal e sem KDF**, e o pepper está
**vazio em produção** — foi assim que deu para identificar, por igualdade de
hash, os 9 admins que ainda usavam a senha padrão. Aguenta 11 admins; **não
serve** para centenas de peregrinos: hash sem sal é rainbow-table direto.

Migrar para **PBKDF2** (nativo no WebCrypto, sem dependência nova) ou Argon2.
Exige re-hash, então o momento é quando as senhas nascerem do zero.

---

## 2. `/perfil` — a página do peregrino

### O que mostra

- **Suas informações:** Nome completo, E-mail, Telefone, e um botão **"Editar
  demais informações"**.
- **Editar demais informações:** abre **todos** os campos do formulário de
  inscrição (endereço, contato de emergência, alergia/medicação, restrição
  alimentar, acompanhante, pernoite, sexo...).
- **Foto:** o peregrino pode trocar a própria foto (bloco 5).
- **Histórico de peregrinação:** as participações dele, por ano.

### O histórico e o ano seguinte

Hoje só existe registro de **2026**. Quando o ano seguinte subir, o lugar do
histórico daquele ano recebe:

> As inscrições de 2027 começaram em Maio de 2027

e esse texto **vira um link para o formulário de inscrição na home (`/`)**.

Ou seja, o mesmo espaço tem dois estados: **"ainda não inscrito neste ano"**
(chamada + link) e **"inscrito"** (dados da inscrição + QR code, bloco 4).

### Decisões a tomar

- A data ("Maio de 2027") é **configuração**, não texto fixo em código — muda
  todo ano. Provável var de ambiente ou tabela de edições.
- Editar a inscrição depois de paga mexe em capacidade: trocar geral↔pernoite
  já tem regra própria (`upgrade-monastery`, com estorno de diferença) e **não
  pode** virar um campo solto no formulário de edição.
- Editar dados de inscrição de ano passado deve ser bloqueado — histórico é
  histórico.

---

## 3. Diferenciar os registros por ano (edição)

### O problema

`registrations` **não tem coluna de ano**. As 728 inscrições atuais são de 2026
apenas por `created_at`. Sem isso não existe "histórico por ano", nem como
saber a que edição uma inscrição pertence.

É **pré-requisito** do `/perfil` e do `/peregrinos`.

### Esboço

```sql
ALTER TABLE registrations ADD COLUMN event_year INTEGER;             -- 2026, 2027...
UPDATE registrations SET event_year = 2026 WHERE event_year IS NULL; -- backfill
CREATE INDEX idx_registrations_year ON registrations (event_year);
```

⚠️ Hoje o CPF é **único global** em `registrations` (índice em `cpf_encrypted`).
Com várias edições, a unicidade passa a ser **(cpf, ano)** — senão ninguém
consegue se inscrever no ano seguinte. **É a mudança mais perigosa deste
plano:** mexe no índice que segura a regra "1 inscrição por CPF" e afeta
`getByCpfEncrypted`, `status`, `cancel`, `upgrade-monastery`, os relatórios e
os webhooks de pagamento. Fazer cedo, com calma e fora de temporada.

---

## 4. QR Code de credenciamento (dentro da inscrição do ano)

### O que é

Cada inscrição de um ano exibe, no `/perfil`, um QR code individual. Na
portaria, ler o código confirma presença — substitui a conferência por lista
impressa.

### O que já existe

- Planilhas de credenciamento (`/api/admin/reports/credenciamento?tipo=...`) —
  o fluxo em papel que isto substitui.
- O projeto **já gera e exibe QR code** no PIX (`qrCodeText` /
  `qrCodeImageUrl`), então há precedente de geração e renderização.

### Decisões

- **Nunca o CPF dentro do QR.** Token opaco por inscrição, aleatório e
  indexado, que não vaze nada se a foto do código circular.
- **Leitor da portaria:** app no celular do staff, com login (bloco 1, papel de
  staff/admin) e registro de quem credenciou.
- **Offline:** e se o sinal cair no mosteiro? Cache local + sincronização.
  **Maior risco do projeto** — a portaria não pode parar.
- **Reentrada/fraude:** o código vale uma vez só? Foto repassada a outra
  pessoa? Definir se é único ou idempotente.

```sql
ALTER TABLE registrations ADD COLUMN checkin_token TEXT;    -- opaco, aleatório
ALTER TABLE registrations ADD COLUMN checked_in_at INTEGER; -- epoch ms
ALTER TABLE registrations ADD COLUMN checked_in_by TEXT;    -- quem escaneou
CREATE UNIQUE INDEX idx_registrations_checkin_token
  ON registrations (checkin_token);
```

---

## 5. Foto do peregrino

Não existe **nenhum storage de imagem** no projeto: os bindings são D1, KV
(`TESTIMONY_AUDIO`) e AI. Precisa de um bucket **R2** novo.

### Decisões

- **R2** (binding novo no `wrangler.toml`), guardando só a chave em
  `users.photo_key` — nunca o binário no D1.
- Limitar tamanho e tipo (jpeg/png/webp) e redimensionar no upload.
- **Moderação:** foto é conteúdo enviado por usuário e apareceria no
  `/peregrinos`. Já existe precedente de moderação nos testemunhos — vale
  reaproveitar o fluxo.
- **LGPD:** imagem de rosto é dado pessoal. Precisa de base legal, consentimento
  e caminho de exclusão.

---

## 6. `/peregrinos` — mapa dos inscritos

### O pedido

Página com um mapa dos inscritos. Clicando em um inscrito, vê-se **Nome e
Cidade**.

### ⚠️ Isto publica dado pessoal de 728 pessoas — decidir ANTES de codar

Um mapa que cruza **nome + cidade** de pessoas identificadas é publicação de
dado pessoal, não um enfeite:

- **LGPD:** exige base legal e **consentimento específico**. Ninguém que se
  inscreveu até hoje concordou em aparecer num mapa público — o termo aceito não
  cobre isso. Aplicar retroativamente às 728 inscrições **não é uma opção**.
- **Segurança:** nome + cidade + "vai estar em tal lugar, em tal data" ajuda
  quem quer localizar alguém. Há mulheres, idosos e crianças na lista.
- **Recomendação:** **opt-in explícito** no formulário ("quero aparecer no mapa
  de peregrinos"), padrão **desligado**, e o mapa mostra só quem marcou. Vale
  considerar exibir apenas a **cidade agregada** ("12 peregrinos de
  Uberlândia") em vez de pessoas individuais — atende ao espírito da ideia com
  uma fração do risco.
- Decidir se a página é **pública** ou exige login.

### Decisões técnicas

- **Não temos coordenadas.** Há `cep`, `city`, `state` — não lat/long. Precisa
  de geocoding. Geocodificar por **cidade** (e não por CEP) já reduz muito a
  exposição: põe o pin no centro da cidade, não perto da casa da pessoa.
  Preferir isso.
- Biblioteca de mapa (Leaflet/MapLibre) pesa; a landing hoje é ~200 kB gzip.
  Carregar sob demanda, só nesta rota.
- Cachear o geocoding: 728 pontos não podem ser resolvidos a cada visita.

---

## 7. Trocar a adquirência (aceitar cartão)

Hoje é **Woovi, só PIX**. Aceitar cartão muda mais coisa do que parece:

- **Estorno:** hoje é manual — a pessoa informa a chave PIX ao cancelar (campo
  criado em 2026) e o admin devolve por fora, acompanhando em `/admin/estorno`.
  Estorno de cartão volta **pelo próprio cartão**, via API da adquirente. O
  campo "Pix para estorno" passa a valer só para quem pagou via PIX — e a tela
  precisa saber a diferença.
- **Webhooks:** `functions/api/webhooks.ts` e `reconcile-pix.ts` são específicos
  da Woovi. Cartão traz estados que o PIX não tem: autorizado ≠ capturado,
  chargeback, parcelamento, antifraude.
- **Expiração:** a regra atual ("PIX vence em 24h e a vaga volta") não existe em
  cartão.
- **Taxas e prazo de repasse** mudam a conta do evento.
- **PCI:** nunca tocar no número do cartão — usar checkout hospedado ou
  tokenização da adquirente.
- Manter **PIX e cartão convivendo** é o cenário mais provável, e dá mais
  trabalho que trocar. `payment_provider` já existe em `registrations`, o que
  ajuda.

---

## Bloqueios que atravessam tudo

### Não existe envio de e-mail

Verificado em 16/07/2026: nenhum Resend/SendGrid/MailChannels. O Cloudflare
Email Workers só **recebe**; o MailChannels encerrou o tier grátis para
Workers. Sem isso não há confirmação de cadastro, link mágico nem recuperação
de senha — e **login sem recuperação de senha vira suporte manual no WhatsApp
para centenas de pessoas**.

Recomendação: **Resend** (3.000 e-mails/mês grátis, domínio já no Cloudflare,
DNS simples). Exige conta, verificação de domínio (SPF/DKIM) e a API key como
*secret* do Pages — nunca como var no `wrangler.toml`.

### Não há type-check nem E2E

`tsconfig.json` usa `moduleResolution: "Bundler"` com `typescript` 4.9.5
fixado: `tsc --noEmit` e `cypress run` **não rodam**. O `react-scripts build`
roda ESLint, mas **não checa tipos** — em 2026 um campo obrigatório que ninguém
enviava passou pelo build sem erro, e uma constante removida derrubou a tela de
login sem o build reclamar.

Encarar login, pagamento e mapa sem essa rede é aceitar que cada regressão só
apareça para o usuário. **Destravar isto primeiro.**

---

## Ordem sugerida

1. **`tsconfig` + Cypress** — a rede. Barato, e destrava a confiança em tudo.
2. **Provedor de e-mail** — sem ele, login e QR code viram suporte manual.
3. **Hash de senha (PBKDF2/Argon2)** — antes de existir conta de público.
4. **`event_year` + unicidade (cpf, ano)** — pré-requisito de perfil, histórico
   e mapa; e a mudança mais perigosa. Fazer cedo e fora de temporada.
5. **Login unificado + `/perfil`** (sem foto).
6. **QR code de credenciamento** — encaixa na inscrição do ano, no `/perfil`.
7. **Foto (R2 + moderação)**.
8. **`/peregrinos`** — só depois de resolvido o opt-in: o consentimento precisa
   estar no formulário **antes** de existir mapa para mostrar.
9. **Adquirência com cartão** — frente própria, com risco próprio.

## Contexto que não está no código

- Evento de 2026: 728 inscrições no banco (~639 pagas, sendo ~600 peregrinos e
  ~38 staff). Teto de 500 peregrinos e 80 camas no mosteiro. Staff sem teto.
- Camisetas: vendas encerradas; 62 pedidos pagos, 4 pendentes, 25 cancelados.
- O deploy é automático no push da `main` (CF Pages), mas **não roda
  migrations**: aplicar à mão com
  `wrangler d1 execute caminhodoperdao-db --env production --remote --file <arquivo>`.
- A propagação leva ~1–2 min depois do push, e o painel marca "Active" antes de
  o site servir o bundle novo. Conferir pelo conteúdo, não pelo painel.
