# Scripts de Relatórios - Caminho do Perdão

Scripts utilitários para gerar relatórios e templates de rastreamento.

## 📊 Scripts Disponíveis

### 1. Amplitude Tracking Plan
**Comando:** `npm run tracking:amplitude`

Gera um arquivo CSV com o plano de rastreamento de eventos para importar no Amplitude Analytics.

**Saída:**
- `scripts/reports/amplitude-import.csv` - Template com 14 eventos e 26 propriedades

**O que está incluído:**
- Event Display Name
- Event Category
- Event Properties (name, type, description)
- Property Visibility Settings
- Enum Values (quando aplicável)

**Como usar no Amplitude:**
1. Acesse [analytics.amplitude.com](https://analytics.amplitude.com)
2. Vá para: Data > Catalog > Import
3. Clique em: "Import Events and Event Properties"
4. Faça upload do arquivo: `amplitude-import.csv`

---

## 📋 Organização de Quartos do Mosteiro
**Comando:** `npm run monastery:organize`

Organiza os peregrinos em grupos/famílias e sugere alocação de quartos.

**🔄 Fluxo Automático:**
1. **Tenta** buscar dados do D1 de produção via Wrangler
2. **Se falhar** (ex: Wrangler não instalado), usa dados de exemplo locais
3. **Gera** ambos os relatórios

**Pré-requisitos para conectar ao D1 real:**
```bash
# 1. Atualizar Node.js para v20+
nvm use 20
# ou
node --version  # Verificar versão

# 2. Instalar Wrangler CLI
npm install -g @cloudflare/wrangler

# 3. Autenticar com Cloudflare
wrangler login

# 4. Executar o script
npm run monastery:organize
```

**📊 Saída:**
- `scripts/reports/monastery-rooms-organization.json` - Relatório detalhado com sugestões de alocação
- `scripts/reports/monastery-rooms-organization.csv` - Lista em formato spreadsheet (NOME, TELEFONE, GRUPO/FAMILIA)

**O que está incluído:**
- Agrupamento automático por família/grupo (baseado em `companion_name`)
- Sugestões de alocação em quartos (máx 4 pessoas por quarto)
- Lista exportável para Excel/Sheets com ordenação por grupo

**Como usar:**
1. Execute: `npm run monastery:organize`
2. Abra em seu editor de planilhas: `scripts/reports/monastery-rooms-organization.csv`
3. Ordene e aloque as pessoas para os quartos conforme necessário

---

## 📁 Estrutura

```
scripts/
├── reports/                          # Relatórios gerados (gitignored)
│   ├── amplitude-import.csv         # Template Amplitude
│   ├── monastery-rooms-organization.json
│   └── monastery-rooms-organization.csv
│
├── generate-amplitude-tracking-plan.js
└── organize-monastery-rooms.js
```

## 📝 Notas

- Todos os relatórios são salvos em `scripts/reports/` para facilitar acesso
- A pasta `reports/` é ignorada no git (ver `.gitignore`)
- Os scripts usam dados de exemplo. Para conectar ao banco D1 real, atualize as queries

## 🔧 Desenvolvimento

Para adicionar novos scripts de relatório:

1. Crie o arquivo em `scripts/novo-script.js`
2. Salve as saídas em `scripts/reports/`
3. Adicione o npm script em `package.json`:
   ```json
   "reports:novo": "node scripts/novo-script.js"
   ```

---

**Última atualização:** 08/01/2026
