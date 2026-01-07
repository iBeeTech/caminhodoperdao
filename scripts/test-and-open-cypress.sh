#!/bin/bash

# Script para rodar testes de componentes E2E e abrir o Cypress em paralelo
# Uso: bash scripts/test-and-open-cypress.sh

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🧪 Iniciando Testes E2E e Cypress"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se a aplicação está rodando
echo -e "${YELLOW}📋 Verificando aplicação em http://localhost:3000...${NC}"
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Aplicação não detectada. Iniciando com 'npm start'...${NC}"
  npm start > /dev/null 2>&1 &
  STARTED_APP=true
  sleep 5
  echo -e "${GREEN}✅ Aplicação iniciada${NC}"
else
  echo -e "${GREEN}✅ Aplicação já está rodando${NC}"
fi
echo ""

# Executar testes E2E em background
echo -e "${BLUE}🚀 Executando testes E2E em background...${NC}"
npm run test:e2e:run > /tmp/e2e-tests.log 2>&1 &
E2E_PID=$!
echo -e "${GREEN}✅ Testes iniciados (PID: $E2E_PID)${NC}"
echo ""

# Aguardar um pouco e depois abrir Cypress UI
echo -e "${BLUE}⏳ Aguardando 3 segundos antes de abrir Cypress UI...${NC}"
sleep 3

echo -e "${YELLOW}📂 Abrindo Cypress Console...${NC}"
npx cypress open

# Limpar background processes
kill $E2E_PID 2>/dev/null || true
if [ "$STARTED_APP" = true ]; then
  pkill -f "npm start" || true
fi

echo ""
echo -e "${GREEN}✅ Completo!${NC}"
