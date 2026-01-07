#!/usr/bin/env bash
# 🚀 Script rápido para setup Amplitude

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║     🎯 AMPLITUDE ANALYTICS - SETUP RÁPIDO             ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado${NC}"
    echo "Execute este script da raiz do projeto"
    exit 1
fi

echo -e "${BLUE}📋 Verificando pré-requisitos...${NC}"
echo ""

# Verificar Node
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js${NC} $NODE_VERSION"
else
    echo -e "${RED}✗ Node.js não encontrado${NC}"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm${NC} $NPM_VERSION"
else
    echo -e "${RED}✗ npm não encontrado${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Verificando dependências Amplitude...${NC}"
echo ""

# Verificar se @amplitude/analytics-browser está instalado
if npm list @amplitude/analytics-browser > /dev/null 2>&1; then
    echo -e "${GREEN}✓ @amplitude/analytics-browser${NC} já instalado"
else
    echo -e "${YELLOW}⚠ @amplitude/analytics-browser${NC} não encontrado"
    echo "Instalando..."
    npm install @amplitude/analytics-browser
fi

echo ""
echo -e "${BLUE}🔧 Verificando arquivo .env.local...${NC}"
echo ""

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local${NC} encontrado"
    
    if grep -q "REACT_APP_AMPLITUDE_KEY" .env.local; then
        echo -e "${GREEN}✓ REACT_APP_AMPLITUDE_KEY${NC} definida"
        
        API_KEY=$(grep "REACT_APP_AMPLITUDE_KEY" .env.local | cut -d'=' -f2)
        
        if [ "$API_KEY" = "your-amplitude-api-key-here" ] || [ "$API_KEY" = "" ]; then
            echo -e "${YELLOW}⚠ REACT_APP_AMPLITUDE_KEY${NC} ainda é placeholder"
            echo ""
            echo "  Para configurar:"
            echo "  1. Vá em https://amplitude.com"
            echo "  2. Crie/acesse seu projeto"
            echo "  3. Copie sua API Key"
            echo "  4. Edite .env.local e substitua 'your-amplitude-api-key-here'"
            echo ""
        else
            echo -e "${GREEN}✓ API Key configurada${NC}"
        fi
    else
        echo -e "${RED}✗ REACT_APP_AMPLITUDE_KEY${NC} não encontrada em .env.local"
    fi
else
    echo -e "${RED}✗ .env.local${NC} não encontrado"
    echo ""
    echo "Criando .env.local com template..."
    cat > .env.local << 'EOF'
# Amplitude Analytics
REACT_APP_AMPLITUDE_KEY=your-amplitude-api-key-here
EOF
    echo -e "${GREEN}✓ .env.local criado${NC}"
    echo ""
    echo "  ⚠️  PRÓXIMO PASSO: Edite .env.local com sua API Key real"
fi

echo ""
echo -e "${BLUE}✨ Arquivos criados/modificados:${NC}"
echo ""

ARQUIVOS=(
    "src/services/analytics/amplitude.ts"
    "src/hooks/useAnalytics.ts"
    "src/hooks/useSectionView.ts"
    "src/index.tsx"
    "src/components/molecules/Header/Header.tsx"
    "src/pages/Landing/Controller/index.tsx"
    "src/pages/Gallery/Controller/index.tsx"
)

for arquivo in "${ARQUIVOS[@]}"; do
    if [ -f "$arquivo" ]; then
        echo -e "${GREEN}✓${NC} $arquivo"
    else
        echo -e "${RED}✗${NC} $arquivo"
    fi
done

echo ""
echo -e "${BLUE}📚 Documentação disponível:${NC}"
echo ""

DOCS=(
    "AMPLITUDE_SETUP_COMPLETE.md - Visão geral da integração"
    "AMPLITUDE_GUIDE.md - Guia completo de uso"
    "AMPLITUDE_EXAMPLES.md - Exemplos práticos"
    "AMPLITUDE_CHECKLIST.md - Checklist de verificação"
)

for doc in "${DOCS[@]}"; do
    if [ -f "${doc%% -*}.md" ]; then
        echo -e "${GREEN}✓${NC} ${doc}"
    else
        echo -e "${YELLOW}○${NC} ${doc}"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║              🎯 PRÓXIMOS PASSOS                        ║"
echo "║                                                        ║"
echo "║  1. Edite .env.local com sua API Key do Amplitude     ║"
echo "║  2. Execute: npm start                                ║"
echo "║  3. Teste clicando em botões e rolando a página       ║"
echo "║  4. Veja eventos em amplitude.com → Monitor           ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Perguntar se deseja iniciar servidor
read -p "Deseja iniciar npm start agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Iniciando servidor...${NC}"
    npm start
fi
