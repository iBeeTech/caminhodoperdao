# Planning — depois do evento de 2026

Frentes decididas em 16/07/2026, **adiadas de propósito** para depois do
evento: mexer em login, credenciamento e pagamento com a inscrição aberta
arrisca o que já está funcionando. Este documento existe para a decisão não se
perder.

O bloco 9 (galeria e venda de fotos) foi levantado em 03/08/2026, já com o
evento encerrado.

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

### Decidido em 03/08/2026

- **O admin fica como está.** O login e o "esqueci minha senha" do admin não
  mudam mais. O fluxo de OTP por e-mail entrou em produção nesta data
  (migration 024) e é o estado final dele. O login novo é **só do peregrino**.
- **Peregrino entra com e-mail + senha.** OTP serve apenas para recuperar
  senha, não como forma de entrar.
- Como o admin não muda, `admin_users` **permanece separada**. A tabela `users`
  nasce só para peregrinos. O "login unificado" original foi abandonado: unificar
  obrigaria a migrar os 11 admins e mexer no que acabou de ser estabilizado, sem
  ganho para o peregrino.
- Já existe e será reaproveitado sem alteração: `functions/_utils/email.ts`
  (envio via Resend) e `functions/_utils/passwordOtp.ts` (código, HMAC, limites,
  expiração).
- **Os 747 inscritos em `registrations` NÃO ganham conta.** Nada de criar login
  em massa: quem já se inscreveu é considerado **sem perfil**, e cria a própria
  conta quando quiser. A inscrição existente é então **ligada pelo CPF**
  (`cpf_encrypted`), que é o que amarra pessoa e histórico.

  Consequências, para não descobrir depois:
  - Perfil só mostra histórico de quem tem CPF gravado. Inscrição antiga sem
    CPF (ver `admin/set-cpf.ts`) fica órfã e não aparece para ninguém.
  - Duas pessoas não podem reivindicar o mesmo CPF. O vínculo precisa de prova
    de posse — o código por e-mail resolve, desde que o e-mail confira com o da
    inscrição.

### ⚠️ Correção de 03/08/2026: a inscrição sai do site público

Decidido depois do texto acima, e o **contradiz de propósito**: o formulário
público de inscrição será **removido**. Inscrever-se passa a exigir conta, e a
inscrição acontece dentro da área logada.

O que isso resolve de imediato:

- O e-mail de login **é** o e-mail da inscrição, por construção. A pergunta de
  "como provar que este CPF é meu" desaparece para toda inscrição nova.
- Some o buraco atual de "digite o CPF e veja a inscrição": hoje quem souber o
  CPF de alguém acessa os dados dessa pessoa. Tudo passa a exigir sessão.
- `registrations.user_id` passa a ser obrigatório **para inscrição nova**. Segue
  nulo nas 747 de 2026, que continuam sem dono até alguém reivindicar.

O que isso cria, e precisa de decisão consciente:

- **Atrito no pior momento.** Hoje a pessoa entra no site e se inscreve numa
  tacada. Passa a ter de criar conta antes. Em 2026 esgotaram-se as 500 vagas;
  cada passo a mais derruba conversão. Se isso preocupar, o caminho é fundir
  criar-conta e inscrever num fluxo só, com a senha definida no fim.
- **Quem não tem e-mail.** Parte do público é idosa. Antes dava para inscrever
  com ajuda de alguém; agora precisa de caixa de e-mail própria. O admin
  continua conseguindo inscrever à mão (`staffRegistration`), e essa passa a ser
  a saída oficial para esses casos — não um remendo.
- **Confirmação de e-mail no cadastro.** Sem confirmar, um e-mail digitado
  errado gera conta que nunca recebe nada — e agora é por ali que passam
  inscrição, QR code e troca. Reaproveita o OTP que já existe.
- **PBKDF2 só na tabela nova.** `users` nasce com PBKDF2; `admin_users` fica com
  o SHA-256 atual, intocada. Evita re-hash dos 11 admins e mexer no que acabou
  de ser estabilizado, e o hash forte entra onde o volume justifica.

### Decisões a tomar antes de codar
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

### Medalhas e selos (decidido em 03/08/2026)

O perfil ganha reconhecimento da jornada. Separados pelo que **já dá para
calcular com o dado que existe** e pelo que exige coisa nova.

Sai de graça do banco atual, bastando `event_year` (bloco 3):

| Selo | De onde sai |
|---|---|
| Medalha do ano ("Peregrino 2026") | uma por `event_year` com inscrição paga |
| Contador de caminhadas ("sua 3ª") | contagem de anos distintos |
| Fundador | participou da primeira edição |
| Servo | `is_staff = 1` em algum ano |
| Mosteiro | dormiu no mosteiro (`sleep_at_monastery`) |
| Semeador | convidou alguém que se inscreveu (`invite_codes`, `group_invited`) |
| Testemunha | gravou testemunho (tabela `testemunhos`) |

⚠️ Regra: medalha só para inscrição **paga e não cancelada**. Contar pendente
faria a medalha aparecer e sumir, o que é pior do que não existir.

Exige trabalho novo, em ordem de custo:

- **Linha do tempo** da jornada, ano a ano — só apresentação do histórico.
- **Card compartilhável** (imagem para story: "Eu caminhei o Caminho do Perdão
  2026"). Barato e é divulgação orgânica para o ano seguinte.
- **Certificado em PDF** para baixar e imprimir.
- **Intenção da caminhada** — por quem/pelo que a pessoa caminha. Casa com o
  espírito do evento; decidir se é privado ou vai para um mural público.
- **Contagem regressiva** para a próxima edição.
- **Fotos do ano** que a pessoa participou — liga no bloco 9.

Não fazer: ranking ou competição entre peregrinos. O evento é religioso, e
comparar quem caminhou mais trai o sentido dele.

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

## 8. Transferir a inscrição para outro peregrino

*(Frente adicionada em 30/07/2026. **Depende da área logada** — blocos 1 e 2 —
e do `event_year`, bloco 3.)*

### O que é

Quem pagou e não pode mais ir passa a vaga para outra pessoa, em vez de
cancelar. Hoje o único caminho é cancelar (vaga volta para o balde, dinheiro
vira linha em `refund_requests` e o admin devolve por fora, no PIX). A troca
resolve os dois lados: o peregrino não fica no prejuízo e a vaga não fica
vazia.

### Como precisa funcionar

- **Não pode passar pelo cancelamento.** Se a transferência cancelar a
  inscrição, a vaga é liberada e pode ser tomada por outra pessoa no intervalo,
  e ainda nasce uma linha de estorno indevida. A vaga tem que continuar `PAID`
  o tempo todo.
- **Mesma linha, dados novos.** Recomendação: manter a mesma linha em
  `registrations` (preserva `payment_ref`, `registration_number` e a contagem
  de vaga) e reescrever os campos pessoais, guardando o histórico numa tabela
  de auditoria. A alternativa — criar linha nova e marcar a antiga como
  `TRANSFERRED` — bate na unicidade `(cpf, ano)` e na ligação com o pagamento.
- **Trocar o nome não basta.** CPF, nascimento, telefone, e-mail, endereço,
  contato de emergência, alergia/medicação e restrição alimentar são da pessoa
  nova. Quem recebe preenche o próprio formulário — o formulário de inscrição
  inteiro, como no "Editar demais informações" do `/perfil`.
- **Aceite de termos é individual.** `terms_accepted_at` do peregrino antigo
  não vale para o novo. Zerar e pedir de novo.
- **Quem recebe não pode já ter inscrição no mesmo ano** — checar antes de
  abrir o convite, senão a troca quebra na unicidade `(cpf, ano)`.
- **Precisa de aceite dos dois lados:** origem indica, destino aceita. Enquanto
  o destino não aceita e não preenche, nada muda na inscrição.
- **Avisos precisam ser reenviados:** `group_invited_at` e
  `monastery_info_sent_at` referem-se ao peregrino antigo. Resetar, senão a
  pessoa nova nunca recebe o convite do grupo nem as instruções do mosteiro.

### Dinheiro

- **Geral → geral e pernoite → pernoite:** nada a cobrar, nada a devolver.
- **Muda o tipo:** reaproveitar a regra que já existe em `upgrade-monastery` —
  upgrade cobra a diferença, downgrade devolve R$50. Não reimplementar.
- ⚠️ **Se a inscrição transferida for cancelada depois, o dinheiro volta para
  quem?** Quem pagou foi a pessoa de origem; o "PIX para estorno" no cadastro
  vai ser o da pessoa nova. Decidir isso **antes** de codar — é o ponto onde a
  troca vira briga. Sugestão: o acerto entre as duas pessoas é por fora, e o
  sistema registra que a inscrição foi transferida para o admin não devolver
  para o lado errado. A tela `/admin/estorno` precisa mostrar esse aviso.

### Decisões a tomar

- **Prazo:** até quando pode transferir? Sugestão: até o fechamento da lista de
  credenciamento — depois disso a portaria já imprimiu/carregou os nomes.
- **QR code (bloco 4):** transferência tem que **invalidar o `checkin_token`
  antigo** e gerar um novo. Um código já compartilhado no WhatsApp não pode
  continuar valendo.
- **Limite de trocas:** uma por inscrição por edição, para não virar revenda de
  vaga. Registrar quem pediu e quando.
- **Admin pode desfazer?** Hoje tudo que dá errado é resolvido na mão. Vale uma
  tela de admin que faça e desfaça a troca, com o histórico à vista.
- **Fila de espera:** já existe a tabela `waitlist`. Quem cancela sem indicar
  ninguém devia oferecer a vaga para a fila — é a mesma conversa, e talvez o
  caminho mais justo que a indicação livre.
- **LGPD:** os dados da pessoa de origem saem da inscrição. No histórico,
  guardar só o mínimo para auditoria (nome e referência), não o cadastro
  inteiro.

### Esboço

```sql
CREATE TABLE registration_transfers (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,       -- a vaga, que não muda
  event_year INTEGER NOT NULL,
  from_name TEXT NOT NULL,
  from_cpf_encrypted TEXT,
  to_name TEXT,
  to_cpf_encrypted TEXT,
  invite_token TEXT,                   -- opaco; é o link que a origem envia
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'DESFEITA')),
  amount_diff_cents INTEGER NOT NULL DEFAULT 0,  -- >0 cobra, <0 estorna
  requested_by TEXT,                   -- users.id de quem pediu
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_transfers_invite_token
  ON registration_transfers (invite_token);
CREATE INDEX idx_transfers_registration
  ON registration_transfers (registration_id, status);
```

Sem provedor de e-mail (ver Bloqueios), o convite sai como **link** para a
origem repassar no WhatsApp — o mesmo remendo do resto do plano.

---

## 9. Galeria de fotos — hospedagem, marca d'água e venda

Levantado em 03/08/2026, depois do evento de 2026: o fotógrafo tem **~2500
fotos em alta resolução** para publicar. O pedido é mostrar prévia com marca
d'água, deixar o peregrino escolher e comprar, e liberar o **download
automático assim que o PIX for pago**.

### Como é hoje

As fotos vivem num **repositório do GitHub** (`iBeeTech/caminhodoperdao-gallery`,
uma pasta por ano). `functions/api/gallery.ts` lista os arquivos pela **Contents
API** do GitHub e devolve URLs do `raw.githubusercontent.com`.

Escala medida em 03/08/2026 no álbum 2025: **41 fotos, 6,4 MB no total, média de
161 KB** — ou seja, já são versões reduzidas, não os originais.

### ⚠️ O modelo atual não suporta 2500 fotos — quatro limites duros

1. **A Contents API devolve no máximo 1000 entradas por diretório.** As fotos
   1001–2500 simplesmente não apareceriam. Não é lentidão, é teto.
2. **Tamanho do repositório.** Original de câmera pesa 5–15 MB; 2500 × 8 MB ≈
   **20 GB**. O GitHub recomenda < 1 GB e trava perto de 5 GB.
3. **`raw.githubusercontent.com` não é CDN de imagem** — é limitado, sujeito a
   throttle, e fora do propósito do serviço para um site com venda.
4. **A tela baixa tudo em tamanho original.** `AlbumView.tsx` renderiza todas as
   fotos com `loading="lazy"`, sem miniatura: a grade encolhe o arquivo cheio
   por CSS, e o modal usa a mesma URL. Rolar 2500 fotos no celular = vários GB.
   Além disso, `Album/index.tsx` baixa a lista de **todos** os anos para exibir
   um só.

Ponto já frágil hoje: a chamada ao GitHub é **sem token** — 60 requisições por
hora, e cada visita à galeria gasta ~3.

### Decisão de arquitetura

Sair do GitHub e ir para **R2** (mesmo bucket/decisão do bloco 5 — vale
resolver o R2 uma vez para foto de peregrino *e* galeria), com **dois prefixos
de propósito diferente**:

| Prefixo | Conteúdo | Acesso |
|---|---|---|
| `previews/` | ~1200px, marca d'água **queimada no arquivo** | público |
| `originais/` | 3000px, qualidade alta (~2 MB) | **privado** — só link assinado pós-pagamento |

⚠️ **A marca d'água precisa ser gravada na imagem** por script, nunca ser tarja
de CSS: sobreposição de CSS é contornada abrindo a URL da imagem direto.

**Entregar 3000px em vez do arquivo bruto** é decisão deliberada: imprime bem
até A3, é indistinguível em tela, e derruba o armazenamento de ~20 GB para
~5 GB. O índice das fotos vira **manifesto estático** gerado no processamento —
mata de uma vez o teto de 1000 arquivos e o limite de 60 req/h.

### Custo (levantado em 03/08/2026 — reconferir, preço muda)

R2: **10 GB grátis/mês** e, o mais relevante, **saída de dados gratuita** (o S3
cobra egress; é onde a conta de galeria explodiria). Acima disso, US$ 0,015 por
GB/mês.

- prévias (2500 × ~150 KB): **375 MB**
- entrega em 3000px (2500 × ~2 MB): **~5 GB**
- **total ~5,4 GB → dentro do nível gratuito**, com folga

Se um dia guardar o bruto da câmera (~20 GB), fica em torno de US$ 0,15/mês.

⚠️ **O R2 exige cartão cadastrado na conta Cloudflare mesmo no nível gratuito.**
Este é o incômodo real, não o valor — foi exatamente por isso que o
`TESTIMONY_AUDIO` ficou em KV ("plano gratuito, sem cartão", `wrangler.toml`).
Mitigação: alerta de gasto na Cloudflare e ficar no perfil de 5 GB.

### Upload do fotógrafo sem perder qualidade

Página com **link secreto e prazo de validade** (ex.: `/upload/<token>`, 7
dias), onde o navegador dele envia **direto para o R2** — byte a byte, sem
passar pelo nosso backend e sem recompressão.

Atalho para a primeira leva, enquanto a página não existe: receber por **Google
Drive ou WeTransfer** e subir por script. **Nunca por WhatsApp ou Telegram** —
os dois recomprimem e destroem a resolução.

### Venda — reaproveitar o molde da camiseta

A tubulação de cobrança **já existe** e o fluxo é o mesmo:

- `functions/_utils/woovi.ts` — `createWooviCharge`, `getWooviChargeStatus`,
  `deleteWooviCharge`
- `functions/api/webhooks.ts` — casa o pagamento por `payment_ref` e marca pago;
  ganha mais um "finder", como já tem para inscrição, upgrade e camiseta
- `tshirt_purchase` — o molde de tabela e de máquina de estados
  (`PENDING`/`PAID`/`CANCELED`)
- `functions/api/pix/status.ts` — o polling que libera a tela sozinha

```
escolhe as fotos → carrinho → cria pedido + cobrança Woovi → QR Code
   → webhook "pago" → tela libera → links assinados (validade curta)
   → e-mail com os mesmos links (depende do provedor de e-mail, ver Bloqueios)
```

### Esboço

```sql
CREATE TABLE photo_order (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,                      -- reenvio do link de download
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',   -- PENDING | PAID | CANCELED
  payment_provider TEXT NOT NULL,
  payment_ref TEXT,
  correlation_id TEXT,
  download_token TEXT,                      -- opaco; troca por links assinados
  download_expires_at INTEGER,              -- epoch ms
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE TABLE photo_order_item (
  order_id TEXT NOT NULL REFERENCES photo_order (id),
  photo_key TEXT NOT NULL,                  -- chave no R2
  unit_price_cents INTEGER NOT NULL,
  PRIMARY KEY (order_id, photo_key)
);
CREATE UNIQUE INDEX idx_photo_order_download_token
  ON photo_order (download_token);
```

### Decisões a tomar antes de codar

- **Cartão na Cloudflare:** sem isso não há R2 e não há download automático.
  É a decisão que trava todas as outras. Plano B: prévias continuam no GitHub
  com manifesto estático, pedido cai no admin e **alguém envia à mão**.
- **Preço:** por foto avulsa ou pacote (ex.: 10 por R$ X)? Pacote complica o
  carrinho e o cálculo do pedido.
- **Repasse ao fotógrafo:** planilha e transferência manual, ou **split** da
  Woovi? O split exige cadastrar a conta dele na adquirência.
- **Fotos de 2025 já publicadas:** continuam grátis e sem marca d'água, ou
  entram na venda?
- **Reembolso de produto digital:** entregue o arquivo, não tem devolução. A
  política precisa estar escrita antes da primeira venda.
- **Direito de imagem:** são fotos de pessoas identificáveis num evento
  religioso. Definir autorização do fotógrafo e canal de pedido de remoção.
- **Paginação:** a grade precisa carregar por partes (ex.: 60 por vez) — a tela
  atual não tem isso e não aguenta 2500.

---

## 10. Loja do Caminho do Perdão

*(Frente adicionada em 04/08/2026. **Nada implementado.**)*

### O que é

Uma loja de produtos do evento — camiseta, caneca, terço, chaveiro, livro,
o que a organização quiser vender. Substitui a seção de camiseta que saía da
home (bloco 11) e deixa de ser "uma venda avulsa por ano" para virar catálogo.

### O que já existe e vira alicerce

A venda da camiseta de 2026 é a loja em miniatura, e funcionou: 62 pedidos
pagos, 4 pendentes, 25 cancelados. O que dá para reaproveitar sem reescrever:

| Peça | Onde está | O que faz |
|---|---|---|
| Cobrança PIX | `functions/_utils/woovi.ts` | cria, consulta e apaga cobrança |
| Casamento do pagamento | `functions/api/webhooks.ts` | acha o pedido por `payment_ref` e marca pago |
| Máquina de estados | `tshirt_purchase` | `PENDING` / `PAID` / `CANCELED` |
| Liberação da tela | `functions/api/pix/status.ts` | polling que destrava sozinho |
| Cancelamento e estorno | `api/tshirt/cancel.ts`, `/admin/estorno` | o caminho de volta, já rodado |

Ou seja: a tubulação de dinheiro **não precisa ser inventada**. O que falta é
catálogo, carrinho e estoque.

### O que é novo de verdade

- **Catálogo com variação.** Camiseta tem tamanho; caneca não tem nada; terço
  pode ter cor. `tshirt_purchase` resolve isso com uma coluna por tamanho
  (`size_p_qty`, `size_m_qty`...), o que **não escala** para um segundo produto.
  Precisa de produto + variação + item de pedido, de verdade.
- **Estoque.** A camiseta foi vendida sob encomenda, sem controle de saldo. Uma
  loja que vende o que não tem gera estorno e desgaste — e estorno aqui é
  manual, no PIX, feito por uma pessoa.
- **Entrega: só retirada no evento.** ✅ Decidido em 04/08/2026. **Não há envio
  pelo correio.** Isso corta fora frete, endereço de entrega, prazo, rastreio e
  extravio — uma frente inteira que some do escopo. Em troca, o pedido só serve
  para quem vai ao evento, e a tela precisa dizer isso **antes** do pagamento,
  não depois: quem compra achando que recebe em casa vira pedido de estorno, que
  aqui é devolução manual no PIX, feita por uma pessoa.
- **Fotos dos produtos.** Cai no mesmo R2 dos blocos 5 e 9. Mais uma razão para
  resolver o cartão na Cloudflare de uma vez.

### Decisões a tomar antes de codar

- ~~Só retirada no evento, ou envio também?~~ — ✅ **só retirada**, decidido em
  04/08/2026.
- **Quem não for ao evento retira como?** Com só-retirada, o produto não
  entregue vira problema de guarda e de estorno. Definir prazo ("retire até tal
  data") e o que acontece depois dele.
- **Exige conta?** A camiseta era vendida sem login. Dentro da conta, o pedido
  fica no perfil e o reenvio de comprovante deixa de ser suporte no WhatsApp.
- **Estoque de verdade ou pré-venda?** Pré-venda (fecha o lote, produz depois) é
  muito mais barato e foi o que já rodou.
- **Reserva da vaga do produto.** O PIX vence em 24h. Enquanto pendente, o item
  fica reservado ou volta para a prateleira? A inscrição já teve exatamente essa
  dor, e a resposta lá foi devolver a vaga no vencimento.
- **Nota fiscal.** Venda de produto físico não é doação. Quem emite, e como?

### Esboço

```sql
CREATE TABLE shop_product (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,             -- URL da loja
  name TEXT NOT NULL,
  description TEXT,
  image_key TEXT,                        -- chave no R2 (blocos 5 e 9)
  price_cents INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Variação (tamanho, cor). Produto sem variação tem UMA linha, com label ''.
-- Assim a consulta é sempre a mesma, com ou sem variação.
CREATE TABLE shop_variant (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES shop_product (id),
  label TEXT NOT NULL,                   -- 'P', 'M', 'Azul'...
  stock_qty INTEGER,                     -- NULL = sem controle (pré-venda)
  UNIQUE (product_id, label)
);

CREATE TABLE shop_order (
  id TEXT PRIMARY KEY,
  user_id TEXT,                          -- nulo se a loja aceitar sem conta
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAID','CANCELED')),
  payment_provider TEXT,
  payment_ref TEXT,
  correlation_id TEXT,
  -- Sem coluna de forma de entrega: é sempre retirada no evento (decidido em
  -- 04/08/2026). Coluna com um valor só é convite para alguém achar que existe
  -- envio e começar a codar frete.
  picked_up_at TEXT,                     -- quando a pessoa retirou, na hora
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE TABLE shop_order_item (
  order_id TEXT NOT NULL REFERENCES shop_order (id),
  variant_id TEXT NOT NULL REFERENCES shop_variant (id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  -- Preço COPIADO no momento da compra: se o produto subir de preço depois, o
  -- pedido antigo não pode mudar de valor sozinho.
  unit_price_cents INTEGER NOT NULL,
  PRIMARY KEY (order_id, variant_id)
);
```

---

## 11. Tirar inscrição e camiseta da home

*(Decidido e **feito** em 04/08/2026.)*

A home deixou de mostrar duas seções:

- **Inscrição** (`SignupSection`) — a inscrição passa a exigir conta e acontece
  dentro da área logada (bloco 1). Enquanto ela não existe lá, a home não pode
  continuar oferecendo um formulário que grava inscrição sem dono.
- **Venda de camiseta** (`TshirtPurchaseSection`) — a venda encerrou, e o lugar
  dela passa a ser a Loja (bloco 10).

Como foi feito, e por quê:

- Os componentes **continuam no repositório** e o `Controller` continua
  alimentando as props deles. O formulário de inscrição custou caro e é
  exatamente o que a inscrição da área logada vai reaproveitar. O que mudou foi
  só o que a home **renderiza**.
- O item "Inscrição" saiu do menu: apontava para `#registration-form`, âncora
  que não existe mais.
- Os botões "Fazer Inscrição" (hero e CTA) apontam agora para `/entrar`.

⚠️ Ponto em aberto: as seções `TSHIRT_PURCHASE` e `REGISTRATION_FORM` seguem no
catálogo de analytics (`utils/analytics/catalog/sections`) sem serem
renderizadas. Não quebra nada — só para de gerar evento.

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

## Estado em 03/08/2026 (fim da sessão)

Feito e no ar:

- ✅ **Resend** — domínio verificado, `RESEND_API_KEY` como secret, `RESEND_FROM`
  no `wrangler.toml`. Sem reply-to em nenhum e-mail, por decisão.
- ✅ **OTP de senha do admin** (migration 024) — testado ponta a ponta pelo
  organizador. O admin não muda mais.
- ✅ **`event_year`** (migration 025) — CPF passou a ser único por (CPF, ano).
- ✅ **Inscrição manual do admin** (migration 026) — `/admin/inscricao-manual`.
- ✅ **2026 arquivado** (migration 027) — 747 linhas em `registrations_old`,
  `registrations` zerada. Histórico passa a ser auto-declarado.
- ✅ **Ambiente de teste isolado** — D1 `caminhodoperdao-db-test`
  (`1057fea7-…`) e KV `TESTIMONY_AUDIO_TEST` (`03bb1906-…`), apontados no
  `[env.preview]`. Antes, preview e produção usavam o mesmo banco.
- ✅ **Conta do peregrino** (migration 028) — tabela `users`, PBKDF2,
  `/api/auth/signup`, `/confirm-email`, `/login`, e as telas `/entrar` e
  `/perfil` (este último ainda esqueleto).

## Estado em 04/08/2026 (fim da sessão)

Feito nesta data (ainda **não aplicado em produção** — ver migration abaixo):

- ✅ **19 edições viraram fonte única** (`functions/_utils/editions.ts`).
  Confirmado pelo organizador: **de 2008 a 2026, sem pular ano**. Antes o
  servidor limitava a declaração a 2015, sem razão registrada — quem caminhou
  antes disso ficava sem a medalha e sem saber por quê.
- ✅ **Dados pessoais na conta** (migration 030) — `users` ganhou nome,
  telefone, CPF, endereço, contato de emergência, alergia/medicação e restrição
  alimentar, mais `years_declared_at`. O contrato passa a ser: a **conta** guarda
  quem a pessoa é; a **inscrição** guarda o que é daquela edição. Quando a
  inscrição na área logada existir, ela nasce preenchida a partir daqui.
- ✅ **CPF set-once** — entra uma vez pela API e depois só o admin muda
  (`/admin/passar-cpf`). Índice único parcial impede duas contas com o mesmo CPF.
  A tela mostra o CPF **mascarado** e o aviso de WhatsApp.
- ✅ **`PUT /api/me`** — edição dos dados do formulário, com validação de
  telefone, CEP, UF, data e sexo.
- ✅ **`/dashboard`** — a tela principal de quem entra. Primeiro acesso pergunta
  os anos (uma vez só, `years_declared_at`); depois disso mostra a **estrada** das
  19 edições, com as caminhadas acesas em dourado e o futuro tracejado.
- ✅ **Medalhas em formato de jogo** — medalhão redondo com fita e metal
  (bronze/prata/ouro), mais a **próxima medalha apagada, com cadeado**, para
  haver o que perseguir. Entraram os selos "Fundador" (primeira edição) e
  "Guardião do caminho" (10 edições).
- ✅ **Cabeçalho com conta** — avatar sempre visível (inclusive no celular) com
  "Perfil" e "Sair"; item **Dashboard** no menu só para quem está logado; botão
  "Entrar" para quem não está.
- ✅ **`/perfil` de verdade** — nome, telefone e e-mail de leitura; "Editar anos
  que participei"; "Atualizar dados do formulário" com tudo editável menos o CPF.
- ✅ **Home sem inscrição e sem camiseta** (bloco 11).
- ✅ **Loja registrada como frente própria** (bloco 10) — planejada, não iniciada.

⚠️ **Aplicar a migration 030 à mão antes do deploy** — o deploy não roda
migrations:
`wrangler d1 execute caminhodoperdao-db --env production --remote --file migrations/030_user_profile.sql`.
Sem ela, `/api/me` quebra em toda leitura, e a área logada inteira para.

Segunda leva do mesmo dia (migration 031):

- ✅ **Papéis na conta** — `users` ganhou `is_staff` e `is_admin`, com auditoria
  (`role_updated_at/by`). Nova tela `/admin/contas`, **restrita ao admin geral**,
  concede e tira papel. Todo admin é servo, e o servidor força isso.
  ⚠️ **Marcar não abre porta:** `is_admin = 1` NÃO libera `/admin` — o painel
  segue exigindo conta em `admin_users`. Esta coluna é a base da unificação
  (bloco 1), não a unificação em si.
- ✅ **Selo de Servo** — primeira medalha com LASTRO: não é auto-declarada, foi a
  organização que marcou. Aparece mesmo para quem não declarou ano nenhum.
- ✅ **CEP preenche endereço sozinho** no cadastro do peregrino, reaproveitando o
  `useAddressByCep` que a inscrição da home já usava. O formulário virou
  componente único (`ProfileForm`), usado no primeiro acesso e no `/perfil` —
  antes eram duas cópias esperando divergir.
- ✅ **Primeiro acesso em dois passos** — anos e depois cadastro, com
  **"Preencher depois"** (`profile_prompted_at`). Os dados vêm depois dos anos
  de propósito: marcar caixinhas custa dez segundos e já entrega a estrada; o
  formulário inteiro na primeira tela seria um paredão antes da recompensa.
- ✅ **Filtro por ano em `/admin/inscritos`** — `event_year` passou a sair da API
  de inscrições. Os anos do filtro vêm dos dados, então a edição nova aparece
  sozinha.

Terceira leva do mesmo dia (migration 032):

- ✅ **Foto de perfil** — upload no `/perfil` e avatar no cabeçalho. A imagem é
  recortada em quadrado e reduzida para 256px **no navegador** antes de subir
  (~25 KB); o binário mora no **KV** (`PROFILE_PHOTO`), o D1 guarda só o carimbo.
  KV e não R2 porque o R2 exige cartão na conta Cloudflare (bloco 9) e o cartão
  segue sem decisão — o mesmo motivo que pôs o áudio dos testemunhos em KV.
- ✅ **A estrada mostra o NÚMERO da edição** (2008 = 1ª, 2026 = 19ª), com o ano
  embaixo. Antes mostrava o ano abreviado ("23, 24, 25"), que parecia idade.
- ✅ **A próxima edição no fim da estrada** — 20ª, 2027, apagada e pontilhada,
  com a data **01/08/2027**. O tracejado sozinho dizia "tem mais", não dizia
  quando.
- ✅ **Temas por edição** (`src/data/editions.ts`) — começaram em 2025. 2026:
  "Maria, caminho seguro que leva a Jesus". ⚠️ **O tema de 2025 está pendente:**
  o organizador começou a informar e a frase ficou incompleta. Fica `null` e a
  tela diz "tema ainda não registrado" — tema de evento religioso não se chuta.
- ✅ **`/medalhas`** — página aberta, sem login, com o catálogo de todas as
  medalhas e a tabela de temas por edição. Medalha que só quem ganhou consegue
  ver não convida ninguém a voltar.
  ⚠️ O catálogo é um **espelho** de `functions/_utils/badges.ts` (o servidor não
  é importável pelo front). Mudou lá, tem de mudar aqui.
- ✅ **Dashboard mais leve** — a página virou clara, com **duas faixas escuras**
  só onde o dourado precisa brilhar (a estrada e a vitrine de medalhas). Azul da
  borda ao rodapé cansava e fazia o texto comum brigar com o fundo.
- ✅ **Cabeçalho menos espremido** — o menu passa a colapsar em 1200px (era
  1090), com fonte e espaçamento menores e "Tutoriais de Cancelamento" reduzido
  a "Tutoriais". Com Dashboard e avatar, os itens não cabiam mais.

Quarta leva do mesmo dia (migration 033):

- ✅ **Chave PIX no cadastro** — `users.refund_pix_key` e `refund_pix_type`.
  Já existia `refund_requests.pix_key` (migration 022), mas ela só é preenchida
  NA HORA do cancelamento, e isso é tarde para dois casos: (1) quem cancela às
  pressas erra a digitação e o admin descobre na hora de devolver; (2) na troca
  de inscrição (bloco 8), quem pagou foi a pessoa de origem, e o "PIX para
  estorno" da inscrição passaria a ser o da pessoa nova. Com a chave na CONTA de
  cada um, o admin sabe para quem devolver sem depender de memória de conversa.
  ⚠️ `refund_requests.pix_key` **continua mandando** na hora do estorno — a
  chave do cadastro é o padrão que preenche aquela, não a substitui.
- ✅ **Cabeçalho agrupado** — "Home" (Início, Cronograma, Sobre, Contato,
  Depoimentos), "Memórias" (Testemunhos, Galeria de Fotos), "Medalhas",
  "Tutoriais" e "Dashboard". Dez itens soltos não cabiam em tela nenhuma.
- ✅ **"Entrar | Cadastrar-se"** — um botão com dois destinos, não dois botões:
  quem chega não sabe se já tem conta, e duas caixas separadas fazem a dúvida
  virar hesitação. `/entrar?cadastro=1` abre já no passo de criar conta.

Quinta leva do mesmo dia (só código, sem migration):

- ✅ **Regras de medalha refeitas**, definidas pelo organizador: bronze por
  edição; **prata a cada 5** e **ouro a cada 10**, e as duas **acumulam** (20
  caminhadas = 4 pratas + 2 ouros); exclusivas para Primeira caminhada,
  Veterano (5), Fundador, Servo e **Jubileu (25)**.
- ✅ **"Nª caminhada" saiu.** Era uma medalha só, que mudava de nome todo ano e
  não somava nada à coleção — o oposto do que uma medalha faz.
- ✅ **Cada exclusiva ganhou cor própria** (amanhecer, aço, vinho e ouro, verde,
  ametista), com brilho ao redor. Enquanto Fundador, Servo e a de 10 anos eram
  douradas iguais, a raridade sumia no meio da fileira: cinco discos amarelos e
  nenhuma pista de qual era o difícil.
- ✅ **A estrada mostra todos os anos sem rolagem**, e o asfalto virou fundo CSS
  repetido por faixa — saíram 19 elementos que só desenhavam tracinho.
- ✅ **Balão por edição** com peregrinos e tema; hover abre, clique trava.
  `/api/editions` (público, cache 1h) soma `registrations` +
  `registrations_old`, só `PAID`. Hoje devolve `{"2026": 630}`.

Pendências abertas nesta sessão:

1. **A foto do peregrino ainda não existe.** O avatar do cabeçalho é a inicial
   sobre o dourado, porque não há storage de imagem no projeto. Vira foto de
   verdade quando o R2 entrar (blocos 5, 9 e 10 dependem do mesmo bucket).
2. **A conta não tem nome no cadastro.** Quem cria conta informa só e-mail e
   senha; o nome só aparece depois, se a pessoa abrir o perfil e preencher. Até
   lá o dashboard cumprimenta sem nome. Resolve junto com o fluxo fundido de
   criar-conta-e-inscrever.
3. **Nada impede duas contas declararem o mesmo histórico.** É a consequência
   assumida do auto-declarado (migration 029), não um bug.

Pendências conhecidas, em ordem de risco:

1. **`schema.sql` está divergente da produção.** Declara `cpf_encrypted TEXT
   UNIQUE`, que não existe no banco real. Quem recriar a base a partir dele
   monta um banco diferente. Corrigir antes que alguém confie nele.
2. **`tsc --noEmit` continua sem rodar** pela config do projeto. A checagem
   manual com TypeScript 5.6 acusa ~27 erros pré-existentes, incluindo
   `savePayment` inexistente em `api/pix/create.ts` (código morto: a cadeia
   `pix.service` → `PixPaymentSection` → `PaymentFlowSection` não é usada por
   ninguém — vale apagar).
3. **As 38 consultas que leem `registrations` não filtram por ano.** Hoje não
   incomoda, porque 2026 foi arquivado e a tabela está vazia. Volta a doer no
   dia em que dois anos coexistirem.
4. **O Resend é o mesmo em teste e produção.** E-mail de teste é e-mail de
   verdade e consome a cota de 3.000/mês.
5. **Recuperar senha do peregrino não existe.** O OTP pronto é do admin
   (`password_otp_challenges`); falta o equivalente para `users`.

Próximo passo: inscrição dentro da área logada (fluxo fundido: criar conta e
inscrever na mesma tela, senha no fim), declarar anos anteriores, e então
`/perfil` de verdade com medalhas.

---


Revisada em 03/08/2026, depois de o e-mail entrar e de o escopo do peregrino
ser fechado (perfil, medalhas, troca, cancelamento, credenciamento).

0. ~~**Provedor de e-mail**~~ — ✅ feito em 03/08/2026 (Resend, domínio
   verificado, `RESEND_API_KEY` como secret do Pages).
1. **`tsconfig` + Cypress** — a rede. Segue pendente: `tsc --noEmit` ainda não
   roda pela config, e a checagem manual com TypeScript 5.6 acusa **27 erros**
   no projeto — inclusive `savePayment` inexistente em `api/pix/create.ts`
   (código morto hoje, mas é exatamente o tipo de coisa que passa batido).
2. **Hash de senha (PBKDF2/Argon2)** — deixou de ser recomendação e virou
   requisito: `hashPassword` é SHA-256 **sem sal**, com pepper vazio em
   produção. Aguenta 11 admins; com centenas de contas de peregrino é
   rainbow-table direto. Tem de entrar **antes** da primeira conta pública.
3. **`event_year` + unicidade (cpf, ano)** — a mudança mais perigosa do plano, e
   pré-requisito de histórico, medalhas, credenciamento por edição e troca.
   Fazer cedo, com calma e fora de temporada.
4. **Login do peregrino** — tabela `users`, e-mail + senha, recuperação pelo OTP
   que já existe.
5. ~~**`/perfil`** base: dados, edição e histórico por ano.~~ — ✅ feito em
   04/08/2026, junto com o `/dashboard`.
6. ~~**Medalhas e selos**~~ — ✅ feito em 04/08/2026, em cima dos anos
   auto-declarados. Voltam a crescer (Servo, Mosteiro, Semeador, Testemunha)
   quando houver inscrição com lastro no ano.
7. **QR code de credenciamento** — encaixa na inscrição do ano, no `/perfil`.
8. **Cancelamento pelo perfil** — o endpoint já existe
   (`api/registration/cancel.ts`); aqui é passar a exigir sessão em vez de CPF.
9. **Transferir inscrição entre peregrinos** — precisa da área logada (4) e de
   invalidar o QR code (7), então vem depois dos dois.
10. **Foto do peregrino (R2 + moderação)** — o R2 é o mesmo do bloco 9.
11. **`/peregrinos`** — só depois de resolvido o opt-in: o consentimento precisa
    estar no formulário **antes** de existir mapa para mostrar.
12. **Adquirência com cartão** — frente própria, com risco próprio.

13. **Loja do Caminho do Perdão** (bloco 10) — depende do R2 para as fotos dos
    produtos e da decisão "só retirada ou também envio". A tubulação de PIX já
    existe, herdada da camiseta.

Fora da fila, sem dependência das anteriores: **galeria e venda de fotos**
(bloco 9), presa só à decisão do cartão na Cloudflare.

**Fora da fila: galeria e venda de fotos (bloco 9).** É trilha independente —
não depende de login, de `event_year` nem do provedor de e-mail (o e-mail só
melhora o reenvio do link). Depende de **uma** decisão: cartão na Cloudflare
para habilitar o R2. Tem urgência própria, porque foto de evento vende no calor
do momento. Se o R2 for aprovado, dá para tocar em paralelo ao bloco 1, e
resolve de quebra o storage do bloco 5 (foto do peregrino).

## Contexto que não está no código

- Evento de 2026: 728 inscrições no banco (~639 pagas, sendo ~600 peregrinos e
  ~38 staff). Teto de 500 peregrinos e 80 camas no mosteiro. Staff sem teto.
- Camisetas: vendas encerradas; 62 pedidos pagos, 4 pendentes, 25 cancelados.
- O deploy é automático no push da `main` (CF Pages), mas **não roda
  migrations**: aplicar à mão com
  `wrangler d1 execute caminhodoperdao-db --env production --remote --file <arquivo>`.
- A propagação leva ~1–2 min depois do push, e o painel marca "Active" antes de
  o site servir o bundle novo. Conferir pelo conteúdo, não pelo painel.
