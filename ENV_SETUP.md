# Configuração de Environment Variables - Cloudflare Pages

Guia passo-a-passo para configurar as variáveis de ambiente no Cloudflare Pages.

## Variáveis Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `MONITOR_TOKEN` | Token para autenticar requisições de health check | `seu-token-secreto-aleatorio` |
| `WOOVI_APP_ID` | ID da aplicação Woovi para integração PIX | `app_xxxxx_xxxxx` |

## Passo-a-Passo

### 1. Acesse o Dashboard do Cloudflare

1. Vá para https://dash.cloudflare.com/
2. Selecione seu account
3. Acesse **Workers & Pages** → seu projeto `caminhodoperdao`

### 2. Configure Environment Variables de Produção

#### Para Production (`[env.production]`)

1. Clique em **Settings**
2. Procure por **Environment variables** ou **Secrets and variables**
3. Clique em **Add variable** (ou **Add secret** para valores sensíveis)

4. **Adicione `MONITOR_TOKEN`**:
   - **Variable name**: `MONITOR_TOKEN`
   - **Type**: Secret (recomendado para tokens)
   - **Value**: Use um token seguro e aleatório
     ```
     Exemplo: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
     ```
   - Clique em **Save**

5. **Adicione `WOOVI_APP_ID`** (se tiver):
   - **Variable name**: `WOOVI_APP_ID`
   - **Type**: Secret
   - **Value**: Seu app ID do Woovi (ex: `app_123456_789abc`)
   - Clique em **Save**

#### Para Preview (`[env.preview]`)

Repita o mesmo processo acima para o environment `preview` (usado durante desenvolvimento com Wrangler).

### 3. Verificar Configuração no `wrangler.toml`

O arquivo `wrangler.toml` já tem a estrutura pronta:

```toml
[env.production]
vars = { ... }

[[env.production.d1_databases]]
binding = "DB"
database_name = "caminhodoperdao-db"
database_id = "784a0aec-8695-48d4-8ede-df680660735e"

[env.preview]
vars = { ... }

[[env.preview.d1_databases]]
binding = "DB"
database_name = "caminhodoperdao-db"
database_id = "784a0aec-8695-48d4-8ede-df680660735e"
```

Você **NÃO precisa modificar** o `wrangler.toml`. Os environment variables são gerenciados pelo Cloudflare Dashboard.

### 4. Testar as Variáveis

Após adicionar as variáveis, faça um novo deploy:

```bash
git push
```

O Cloudflare Pages detectará automaticamente o novo commit e fará deploy.

Você pode testar os endpoints:

```bash
# Sem token (se MONITOR_TOKEN não for obrigatório)
curl https://caminhodoperdao.pages.dev/api/health

# Com token
curl -H "x-monitor-token: seu-token-secreto-aleatorio" \
  https://caminhodoperdao.pages.dev/api/health
```

## Gerador de Token Seguro

Use este comando para gerar um token aleatório e seguro:

### macOS/Linux
```bash
openssl rand -hex 16
# Exemplo de saída: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Windows (PowerShell)
```powershell
[System.BitConverter]::ToString([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(16)) -replace '-'
# Exemplo de saída: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6
```

### Online
Use https://www.random.org/bytes/ e copie os bytes em hex format.

## Verificação de Segurança

✅ **Boas práticas**:
- Use "Secret" em vez de "Variable" para tokens sensíveis
- Regenere tokens periodicamente
- Não compartilhe tokens em repositórios públicos
- Use tokens diferentes para production e preview

❌ **Não faça**:
- Adicionar tokens aos arquivos `.env` commitados no git
- Reutilizar o mesmo token em múltiplos projetos
- Usar tokens previsíveis (números sequenciais, etc)

## Troubleshooting

### Erro 401 na requisição de health check

**Causa**: Token não configurado ou token errado

**Solução**: 
1. Verifique se `MONITOR_TOKEN` está configurado no Cloudflare
2. Verifique se o token enviado na requisição está correto
3. Regenere o token e atualize em ambos os locais

### Variáveis não aparecem nos logs

**Causa**: Podem levar alguns minutos para propagar

**Solução**:
1. Aguarde 2-3 minutos após salvar
2. Faça um novo deploy (`git push`)
3. Verifique os logs no Cloudflare Dashboard

### "Cannot access environment variable"

**Causa**: Variável não está acessível no contexto do Function

**Solução**:
1. Certifique-se de que está usando `context.env?.MONITOR_TOKEN`
2. Verifique se a variável foi adicionada ao environment correto
3. Regenere o token e salve novamente

## Referências

- [Cloudflare Pages - Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Cloudflare Workers - Secrets](https://developers.cloudflare.com/workers/platform/environment-variables/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
