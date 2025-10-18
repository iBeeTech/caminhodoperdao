# Estrutura MVC - Caminho do Perdão

Este projeto implementa uma arquitetura MVC (Model-View-Controller) para o site "Caminho do Perdão", usando React com TypeScript.

## 📁 Estrutura de Pastas

```
src/
├── components/           # Componentes reutilizáveis (View)
│   ├── Header/          # Componente de cabeçalho
│   │   ├── Header.tsx   # Componente React
│   │   ├── Header.css   # Estilos do componente
│   │   └── index.ts     # Export do componente
│   └── index.ts         # Export de todos os componentes
├── pages/               # Páginas da aplicação (View)
│   ├── Landing/         # Página principal
│   │   ├── Landing.tsx  # Componente da página
│   │   ├── Landing.css  # Estilos da página
│   │   └── index.ts     # Export da página
│   └── index.ts         # Export de todas as páginas
├── controllers/         # Lógica de negócio (Controller)
│   └── LandingController.ts # Controller da página Landing
├── models/              # Modelos de dados (Model)
│   └── LandingModels.ts # Interfaces e tipos para a Landing
├── App.tsx              # Componente principal
├── App.css              # Estilos globais
└── index.tsx            # Ponto de entrada da aplicação
```

## 🏗️ Arquitetura MVC

### Model (Modelos)

- **Localização**: `src/models/`
- **Responsabilidade**: Definir interfaces, tipos e estruturas de dados
- **Exemplo**: `LandingModels.ts` contém interfaces para o conteúdo da página Landing

### View (Visualização)

- **Localização**: `src/components/` e `src/pages/`
- **Responsabilidade**: Interface do usuário e apresentação
- **Componentes**:
  - `Header`: Componente de cabeçalho reutilizável
  - `Landing`: Página principal do site

### Controller (Controlador)

- **Localização**: `src/controllers/`
- **Responsabilidade**: Lógica de negócio, manipulação de dados e ações do usuário
- **Exemplo**: `LandingController.ts` gerencia dados e ações da página Landing

## 🎨 Componentes Criados

### Header Component

- **Localização**: `src/components/Header/`
- **Funcionalidades**:
  - Logo/título configurável
  - Menu de navegação responsivo
  - Botão de ação (CTA)
  - Design moderno com gradientes

### Landing Page

- **Localização**: `src/pages/Landing/`
- **Seções**:
  - Hero Section (seção principal)
  - Features (características)
  - Testimonials (depoimentos)
  - Call to Action (chamada para ação)
  - Footer (rodapé)

## 🚀 Como Usar

### Executar o Projeto

```bash
npm start
```

### Estrutura de Dados

O conteúdo da página é gerenciado através do `LandingController`, que fornece dados estruturados conforme as interfaces definidas em `LandingModels`.

### Personalização

1. **Conteúdo**: Modifique os dados em `LandingController.ts`
2. **Estilos**: Ajuste os arquivos CSS correspondentes
3. **Funcionalidades**: Adicione novos métodos no controller

## 📱 Responsividade

O design é totalmente responsivo com breakpoints:

- Desktop: > 768px
- Tablet: 768px - 480px
- Mobile: < 480px

## 🎨 Design System

### Cores Principais

- Primary: `#667eea` (azul)
- Secondary: `#764ba2` (roxo)
- Dark: `#2c3e50`
- Light: `#f8f9fa`

### Tipografia

- Fonte: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- Tamanhos: Responsivos usando rem

### Componentes de UI

- Botões com gradientes e animações
- Cards com sombras e efeitos hover
- Navegação sticky
- Animações CSS personalizadas

## 🔧 Extensibilidade

A estrutura MVC permite fácil extensão:

1. **Novos Componentes**: Adicionar em `src/components/`
2. **Novas Páginas**: Adicionar em `src/pages/`
3. **Novos Models**: Adicionar em `src/models/`
4. **Novos Controllers**: Adicionar em `src/controllers/`

## 📋 Funcionalidades Implementadas

- ✅ Estrutura MVC completa
- ✅ Componente Header reutilizável
- ✅ Landing Page com múltiplas seções
- ✅ Design responsivo
- ✅ Animações CSS
- ✅ TypeScript para tipagem
- ✅ Tracking de analytics (preparado)
- ✅ Modularização de componentes

## 🎯 Próximos Passos

- [ ] Implementar roteamento (React Router)
- [ ] Adicionar mais páginas
- [ ] Integrar com API real
- [ ] Implementar testes unitários
- [ ] Adicionar internacionalização
- [ ] Otimizar performance

---

Esta estrutura fornece uma base sólida e escalável para o desenvolvimento do projeto "Caminho do Perdão".
