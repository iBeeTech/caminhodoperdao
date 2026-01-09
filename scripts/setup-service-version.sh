#!/bin/bash

# Script para adicionar SERVICE_VERSION via Cloudflare API
# Use este script após fazer login com wrangler

VERSION_VALUE="0.1.0"
PROJECT_NAME="caminhodoperdao"

echo "ℹ️  SERVICE_VERSION Configuration"
echo ""
echo "Para adicionar o SERVICE_VERSION via wrangler, use:"
echo ""
echo "1. Atualize Node.js para v20+ usando:"
echo "   nvm install 20"
echo "   nvm use 20"
echo ""
echo "2. Então rode:"
echo "   wrangler secret put SERVICE_VERSION --env production"
echo "   # Digite o valor quando solicitado: $VERSION_VALUE"
echo ""
echo "   wrangler secret put SERVICE_VERSION --env preview"
echo "   # Digite o valor quando solicitado: $VERSION_VALUE"
echo ""
echo "=== OU ==="
echo ""
echo "Adicione manualmente via Cloudflare Dashboard:"
echo "1. Vá para: https://dash.cloudflare.com/"
echo "2. Workers & Pages → caminhodoperdao"
echo "3. Settings → Environment variables"
echo "4. Add variable"
echo "5. Name: SERVICE_VERSION"
echo "6. Type: Plaintext (⚠️ NOT Secret)"
echo "7. Value: $VERSION_VALUE"
echo "8. Clique em Save"
echo ""
echo "9. Repita para o environment 'preview'"
echo ""
echo "Após adicionar, os endpoints /api/health retornarão:"
echo '{
  "status": "ok",
  "service": "caminhodoperdao",
  "version": "'$VERSION_VALUE'",
  ...
}'
