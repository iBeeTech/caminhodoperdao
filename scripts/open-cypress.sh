#!/bin/bash

# Script para abrir o Cypress Console
# Uso: bash scripts/open-cypress.sh

echo "════════════════════════════════════════════════════════════════"
echo "📂 Abrindo Cypress Console"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se a aplicação está rodando
echo -e "${YELLOW}📋 Verificando aplicação em http://localhost:3000...${NC}"
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Aplicação não detectada em http://localhost:3000${NC}"
  echo -e "${YELLOW}💡 Dica: Execute 'npm start' em outro terminal${NC}"
  echo ""
fi

echo -e "${GREEN}✅ Iniciando Cypress Console...${NC}"
echo ""

# Abrir Cypress
npx cypress open

echo ""
echo -e "${GREEN}✅ Cypress fechado${NC}"
