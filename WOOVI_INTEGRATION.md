# Integração Woovi/OpenPix - PIX Payment

Guia completo para integrar pagamentos PIX com Woovi/OpenPix no seu projeto Cloudflare Pages.

## 🔧 Configuração Inicial

### 1. Criar Aplicação na Woovi

1. Acesse [app.openpix.com.br](https://app.openpix.com.br)
2. Vá para **Api/Plugins** na barra lateral
3. Clique em **Nova API/Plugin**
4. Selecione **API** (backend)
5. Configure autenticação de dois fatores
6. Copie o **AppID** gerado

### 2. Variáveis de Ambiente

Adicione ao `wrangler.toml`:

```toml
[env.production]
vars = { 
  WOOVI_APP_ID = "seu_app_id_aqui",
  SITE_URL = "https://caminhodoperdao.com.br"
}

[env.staging]
vars = { 
  WOOVI_APP_ID = "seu_app_id_staging",
  SITE_URL = "https://staging.caminhodoperdao.com.br"
}
```

Ou como secrets (recomendado para produção):

```bash
wrangler secret put WOOVI_APP_ID --env production
```

### 3. Webhook (Opcional mas Recomendado)

Se quiser registrar um webhook para confirmações automáticas:

```bash
curl -X POST https://api.openpix.com.br/api/v1/webhook \
  -H "Authorization: SEU_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Confirmação PIX",
      "event": "OPENPIX:TRANSACTION_RECEIVED",
      "url": "https://caminhodoperdao.com.br/api/webhooks/pix",
      "isActive": true
    }
  }'
```

Salve o webhook ID para referência.

## 📦 Dependências

Nenhuma dependência adicional é necessária! O projeto usa apenas:
- TypeScript nativo
- Fetch API (já disponível em Cloudflare Workers)
- React hooks para o frontend

## 🗄️ Banco de Dados

### Criar Tabela

Execute a migration:

```bash
wrangler d1 execute caminhodoperdao-db --file=migrations/001_create_payments.sql
```

Ou manualmente:

```bash
wrangler d1 execute caminhodoperdao-db --remote --command "
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  correlation_id TEXT NOT NULL UNIQUE,
  provider_charge_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'expired', 'error')),
  brcode TEXT,
  qr_code_image TEXT,
  qr_code_url TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_payments_email ON payments(email);
CREATE INDEX idx_payments_correlation_id ON payments(correlation_id);
CREATE INDEX idx_payments_provider_charge_id ON payments(provider_charge_id);
CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);
CREATE INDEX idx_payments_email_status ON payments(email, status) WHERE status IN ('created', 'pending');
"
```

## 🚀 API Endpoints

### POST `/api/pix/create`

Criar uma cobrança PIX.

**Request:**
```json
{
  "email": "usuario@example.com",
  "name": "João Silva",
  "amountCents": 10000,
  "description": "Inscrição no evento"
}
```

**Response:**
```json
{
  "status": "success",
  "correlationId": "9134e286-6f71-427a-bf00-241681624587",
  "brcode": "000201010212261060014br.gov.bcb.pix...",
  "qrCodeImage": "https://api.woovi.com/openpix/charge/brcode/image/...",
  "qrCodeUrl": "https://api.woovi.com/openpix/charge/brcode/image/...",
  "expiresAt": 1641060531000,
  "paymentUrl": "https://caminhodoperdao.com.br/pay/9134e286-6f71-427a-bf00-241681624587"
}
```

### GET `/api/pix/status?email=usuario@example.com`

Consultar status da última cobrança.

**Response:**
```json
{
  "status": "pending",
  "expiresAt": 1641060531000,
  "brcode": "000201010212261060014br.gov.bcb.pix...",
  "qrCodeImage": "https://api.woovi.com/...",
  "qrCodeUrl": "https://api.woovi.com/...",
  "paymentUrl": "https://caminhodoperdao.com.br/pay/..."
}
```

Status possíveis:
- `created` - Recém criada
- `pending` - Aguardando pagamento
- `paid` - Paga (paidAt será informado)
- `expired` - Expirou
- `error` - Erro ao processar

### POST `/api/webhooks/pix`

Recebe confirmações de pagamento da Woovi.

**Payload recebido:**
```json
{
  "charge": {
    "status": "COMPLETED",
    "correlationID": "9134e286-6f71-427a-bf00-241681624587",
    "value": 10000
  },
  "pix": {
    "transactionID": "9134e2866f71427abf00241681624586",
    "value": 10000,
    "endToEndId": "E18236120202012032010s0133872GZA"
  }
}
```

## 💻 Usando no React

### Simples - com estado gerenciado

```tsx
import { PixPaymentSection } from '@components/molecules';

function RegistrationForm({ email, name }) {
  const handlePaymentSuccess = () => {
    // Usuário pagou com sucesso!
    // Redirecionar, mostrar mensagem, etc.
  };

  return (
    <form>
      {/* Seus campos de form... */}
      
      <PixPaymentSection
        email={email}
        name={name}
        amountCents={29900} // R$ 299,00
        description="Inscrição - Caminho do Perdão 2024"
        onPaymentSuccess={handlePaymentSuccess}
      />
    </form>
  );
}
```

### Avançado - Integração Manual

```tsx
import { createPixCharge, getPixStatus } from '@services/pix/pix.service';

function CustomPaymentUI() {
  const [pixData, setPixData] = useState(null);

  const generateCharge = async () => {
    const response = await createPixCharge({
      email: 'user@example.com',
      name: 'João Silva',
      amountCents: 10000,
    });

    if (response.status === 'success') {
      setPixData(response);
    }
  };

  const checkStatus = async () => {
    const status = await getPixStatus('user@example.com');
    console.log('Status:', status);
  };

  return (
    <>
      <button onClick={generateCharge}>Gerar PIX</button>
      {pixData && (
        <>
          <img src={pixData.qrCodeImage} alt="QR Code" />
          <p>{pixData.brcode}</p>
          <button onClick={checkStatus}>Verificar Status</button>
        </>
      )}
    </>
  );
}
```

## 🔒 Segurança

### Princípios Implementados

1. **AppID no Backend**: Nunca exposto no frontend
2. **LGPD Compliance**: Emails não são logados em plain text
3. **Idempotência**: Mesma cobrança não é criada duas vezes
4. **Webhook Validation**: Token configurável para validar webhooks
5. **HTTPS Obrigatório**: Todas as requisições são criptografadas

### Validações

- Email básico é validado
- Valores devem ser > 0
- Webhook signature opcional (WOOVI_WEBHOOK_SECRET)

## 🧪 Testes

### Testar Webhook Localmente

```bash
curl -X POST http://localhost:8787/api/webhooks/pix \
  -H "Content-Type: application/json" \
  -d '{
    "charge": {
      "status": "COMPLETED",
      "correlationID": "seu-correlation-id",
      "value": 10000,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:01Z"
    },
    "pix": {
      "transactionID": "12345",
      "value": 10000,
      "time": "2024-01-01T00:00:01Z",
      "endToEndId": "E1234567890123456789012345678"
    }
  }'
```

### Testar API Create

```bash
curl -X POST http://localhost:3000/api/pix/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "amountCents": 10000,
    "description": "Test charge"
  }'
```

## 📋 Troubleshooting

### "AppID não configurado"
- Verifique `WOOVI_APP_ID` em `wrangler.toml` ou secret
- Teste com: `wrangler secret list --env production`

### "Nenhum pagamento encontrado"
- Verifique que a tabela `payments` foi criada
- Teste: `wrangler d1 execute caminhodoperdao-db --remote --command "SELECT * FROM payments"`

### Webhook não recebe confirmações
- Registre novo webhook no dashboard Woovi
- Verifique URL está correta e acessível
- Ative modo de teste no dashboard Woovi

### QR Code não aparece
- Verifique que `qrCodeImage` está sendo retornado por Woovi
- Cheque CORS headers se a imagem vem de CDN

## 📚 Referências

- [Documentação Woovi/OpenPix](https://developers.openpix.com.br)
- [Guia de Integração](https://developers.openpix.com.br/docs/apis/getting-started-api)
- [Postman Collection](https://www.postman.com/openpixapp/workspace/openpix-workspace)
- [Dashboard Woovi](https://app.openpix.com.br)

## 🆘 Suporte

Para problemas com a API Woovi:
- Email: suporte@openpix.com.br
- Chat: Chat do dashboard Woovi
- Documentação: https://developers.openpix.com.br/docs

---

**Última atualização:** 08/01/2026
