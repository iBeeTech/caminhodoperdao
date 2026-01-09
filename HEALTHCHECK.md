# Health Check Monitoring

Monitoramento de disponibilidade da Caminhada do Perdão de Assis usando HetrixTools ou qualquer outro serviço de uptime monitoring.

## Endpoints Disponíveis

### 1. `/api/health` - Healthcheck Geral
**Método**: GET  
**Path**: `/api/health`  
**Descrição**: Verifica se a aplicação está funcionando

**Resposta de sucesso (200)**:
```json
{
  "status": "ok",
  "service": "caminhodoperdao",
  "version": "1.0.0",
  "timestamp_ms": 1673456789123,
  "duration_ms": 5,
  "region": "gru"
}
```

**Headers importantes**:
- `Cache-Control: no-store` - Sem cache para garantir resultado sempre fresco

---

### 2. `/api/health/db` - Conectividade do Banco D1
**Método**: GET  
**Path**: `/api/health/db`  
**Descrição**: Testa a conexão com o banco de dados D1

**Resposta de sucesso (200)**:
```json
{
  "status": "ok",
  "db": "ok",
  "db_response_ms": 3,
  "timestamp_ms": 1673456789123,
  "duration_ms": 8,
  "region": "gru"
}
```

**Resposta de erro (500)**:
```json
{
  "status": "error",
  "db": "error",
  "message": "db_unavailable",
  "timestamp_ms": 1673456789123,
  "duration_ms": 2500
}
```

---

### 3. `/api/health/pix` - Status de Integração PIX
**Método**: GET  
**Path**: `/api/health/pix`  
**Descrição**: Verifica se a integração PIX/Woovi está configurada

**Resposta quando configurado (200)**:
```json
{
  "status": "ok",
  "pix": "configured",
  "timestamp_ms": 1673456789123,
  "duration_ms": 5,
  "region": "gru"
}
```

**Resposta quando não configurado (200)**:
```json
{
  "status": "ok",
  "pix": "not_configured",
  "message": "pix_integration_disabled",
  "timestamp_ms": 1673456789123,
  "duration_ms": 3
}
```

---

## Autenticação (Opcional)

### Configurar Token de Monitoramento

1. **No Cloudflare Pages/Workers**:
   - Vá para seu projeto no dashboard do Cloudflare
   - Acesse **Settings > Environment variables**
   - Crie uma variável chamada `MONITOR_TOKEN` com valor secreto
   - Exemplo: `MONITOR_TOKEN = "seu-token-secreto-aleatorio"`

2. **Usando o Token**:
   - Opção 1: Header HTTP
     ```
     GET /api/health HTTP/1.1
     x-monitor-token: seu-token-secreto-aleatorio
     ```
   - Opção 2: Query parameter
     ```
     GET /api/health?token=seu-token-secreto-aleatorio
     ```

3. **Resposta sem token (quando configurado)**:
   ```
   HTTP/1.1 401 Unauthorized
   {
     "status": "error",
     "message": "unauthorized",
     "timestamp_ms": 1673456789123,
     "duration_ms": 2
   }
   ```

### Rate Limiting

- **Limite**: 30 requisições por minuto por IP
- **Resposta quando atingido**:
  ```
  HTTP/1.1 429 Too Many Requests
  {
    "status": "error",
    "message": "rate_limited",
    "timestamp_ms": 1673456789123,
    "duration_ms": 1
  }
  ```

---

## Configuração no HetrixTools

### Monitor de Uptime HTTP

1. **Acesse**: https://hetrixtools.com/
2. **Novo Monitor** → **HTTP/HTTPS Monitor**
3. **Configuração**:
   - **URL**: `https://caminhodoperdao.pages.dev/api/health`
   - **Method**: GET
   - **Expected HTTP Status**: 200
   - **Intervalo**: 5-10 minutos (recomendado)
   - **Timeout**: 30 segundos
   - **Retries**: 2

4. **Autenticação** (se token configurado):
   - **Custom Headers**:
     ```
     x-monitor-token: seu-token-secreto-aleatorio
     ```

5. **Keyword Monitor** (opcional):
   - Ativar "Search for keyword"
   - Keyword: `"status":"ok"`
   - Isso garante que não apenas a página responde, mas que a lógica está funcionando

---

### Monitor de Banco de Dados

1. **Novo Monitor** → **HTTP/HTTPS Monitor**
2. **Configuração**:
   - **URL**: `https://caminhodoperdao.pages.dev/api/health/db`
   - **Expected HTTP Status**: 200
   - **Keyword**: `"db":"ok"`
   - **Intervalo**: 15 minutos
   - **Alarme**: Verificar todas as falhas

---

### Monitor de PIX (Opcional)

1. **Novo Monitor** → **HTTP/HTTPS Monitor**
2. **Configuração**:
   - **URL**: `https://caminhodoperdao.pages.dev/api/health/pix`
   - **Expected HTTP Status**: 200
   - **Intervalo**: 30 minutos
   - **Nota**: Este monitor é mais informativo, pois PIX pode estar "not_configured" sem ser um erro

---

## Exemplos de Requisição

### Com cURL

```bash
# Healthcheck geral
curl -i https://caminhodoperdao.pages.dev/api/health

# Com token
curl -i -H "x-monitor-token: seu-token" https://caminhodoperdao.pages.dev/api/health

# Verificar BD
curl -i https://caminhodoperdao.pages.dev/api/health/db

# Com jq para pretty-print
curl -s https://caminhodoperdao.pages.dev/api/health | jq .
```

### Com Node.js/JavaScript

```javascript
// Healthcheck simples
const response = await fetch('https://caminhodoperdao.pages.dev/api/health');
const health = await response.json();
console.log(health.status); // "ok"

// Com token
const response = await fetch('https://caminhodoperdao.pages.dev/api/health', {
  headers: {
    'x-monitor-token': 'seu-token-secreto'
  }
});
```

### Com Python

```python
import requests
import json

response = requests.get('https://caminhodoperdao.pages.dev/api/health')
health = response.json()
print(health['status'])  # "ok"
```

---

## Interpretando Respostas

### Status e Significado

| Status | Código HTTP | Significado |
|--------|------------|------------|
| `ok` | 200 | Tudo funcionando normalmente |
| `error` | 500 | Erro interno (checar logs) |
| `unauthorized` | 401 | Token inválido ou ausente |
| `rate_limited` | 429 | Muitas requisições do IP |

### Campo `message`

- `"db_unavailable"`: Banco D1 não está respondendo
- `"db_not_configured"`: Variável DB não existe no env
- `"pix_integration_disabled"`: Sem integração PIX (normal)
- `"unauthorized"`: Token inválido
- `"rate_limited"`: Rate limit excedido
- `"internal_error"`: Erro desconhecido (checar logs do Cloudflare)

### Latência

- `duration_ms`: Tempo total da requisição (em ms)
- `db_response_ms`: Tempo só do query no BD (em ms)
- Use para monitorar degradação de performance

---

## Boas Práticas

✅ **Faça**:
- Monitorar `/api/health/db` para alertar sobre problemas de banco
- Usar token de autenticação para evitar abuso
- Verificar keywords junto com status HTTP
- Manter intervalo de verificação em 5-30 minutos

❌ **Não faça**:
- Usar healthcheck como teste de funcionalidade completa
- Fazer requisições com frequência menor que 5 min (spam)
- Expor token em URLs públicas (use headers)
- Chamar endpoints em um loop sem intervalo

---

## Troubleshooting

### Resposta 500 do `/api/health/db`

```json
{
  "status": "error",
  "db": "error",
  "message": "db_unavailable"
}
```

**Possíveis causas**:
1. D1 fora (raro em Cloudflare)
2. Limite de conexões excedido
3. Query timeout

**Solução**: Verificar logs do Cloudflare Pages

### Resposta 401

```json
{
  "status": "error",
  "message": "unauthorized"
}
```

**Possível causa**: Token incorreto ou não enviado

**Solução**: Verificar se `MONITOR_TOKEN` foi definido e token enviado está correto

### Resposta 429

```json
{
  "status": "error",
  "message": "rate_limited"
}
```

**Possível causa**: Muitas requisições do mesmo IP

**Solução**: Aumentar intervalo entre requisições ou usar token (tokens podem ter limite separado)

---

## Roadmap

- [ ] Suporte a múltiplos tokens (por monitor)
- [ ] Métricas mais detalhadas (cache hits, temps DB P95)
- [ ] Integration com Datadog/New Relic
- [ ] Health check de fila de tarefas (se implementar)

---

## Suporte

Para dúvidas ou reportar problemas:
- 📧 Email: contato@caminhodoperdao.com
- 🐛 Issues: GitHub repository
