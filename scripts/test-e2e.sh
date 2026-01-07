#!/bin/bash

# Script para rodar todos os testes E2E com Cypress
# Uso: bash scripts/test-e2e.sh

set -e

echo "================================================"
echo "🧪 Executando Testes E2E com Cypress"
echo "================================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se a aplicação está rodando
echo -e "${YELLOW}📋 Verificando se a aplicação está rodando em http://localhost:3000${NC}"
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${RED}❌ Erro: Aplicação não está rodando em http://localhost:3000${NC}"
  echo "Execute 'npm start' em outro terminal"
  exit 1
fi
echo -e "${GREEN}✅ Aplicação detectada em http://localhost:3000${NC}"
echo ""

# Parâmetro para rodar teste específico
if [ "$1" != "" ]; then
  echo -e "${YELLOW}🎯 Rodando teste específico: $1${NC}"
  npx cypress run --spec "cypress/e2e/frontend/components/$1/**/*.cy.ts"
else
  echo -e "${YELLOW}📊 Rodando todos os testes...${NC}"
  echo ""
  
  # Executar CA001
  echo -e "${YELLOW}1️⃣  CA001 - Landing Page${NC}"
  npx cypress run --spec "cypress/e2e/frontend/components/landing/CA001.cy.ts" --quiet
  echo -e "${GREEN}✅ CA001 concluído${NC}"
  echo ""
  
  # Executar CA002
  echo -e "${YELLOW}2️⃣  CA002 - Gallery Page${NC}"
  npx cypress run --spec "cypress/e2e/frontend/components/gallery/CA002.cy.ts" --quiet
  echo -e "${GREEN}✅ CA002 concluído${NC}"
  echo ""
  
  # Executar CA003
  echo -e "${YELLOW}3️⃣  CA003 - Error Page${NC}"
  npx cypress run --spec "cypress/e2e/frontend/components/error/CA003.cy.ts" --quiet
  echo -e "${GREEN}✅ CA003 concluído${NC}"
  echo ""
fi

echo "================================================"
echo -e "${GREEN}✅ Todos os testes foram executados!${NC}"
echo "================================================"
echo ""
echo "📊 Resumo:"
echo "   - CA001: 24 testes (Landing Page)"
echo "   - CA002: 26 testes (Gallery Page)"
echo "   - CA003: 35 testes (Error Page)"
echo "   - Total: 85 testes"
echo ""
echo "💡 Dicas:"
echo "   - npm run test:e2e           # Abrir Cypress UI"
echo "   - npm run test:e2e:landing   # Rodar apenas CA001"
echo "   - npm run test:e2e:gallery   # Rodar apenas CA002"
echo "   - npm run test:e2e:error     # Rodar apenas CA003"
echo ""
