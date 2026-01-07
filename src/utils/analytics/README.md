# Amplitude Analytics Refatorado

## 📋 Resumo da Implementação

Sistema padronizado de eventos para Amplitude com foco em:
- ✅ **Nomes de eventos genéricos** (page_viewed, section_viewed, cta_clicked, form_*, etc)
- ✅ **Propriedades em event_properties** (diferenciação via props, não via nomes)
- ✅ **LGPD-compliant** (PII removido automaticamente)
- ✅ **Type-safe** (TypeScript com validação em dev)
- ✅ **Contexto automático** (page_name, route, timestamp injetados)

---

## 🏗️ Arquitetura

### Camadas

```
Components/Hooks (useAnalytics, useSectionView)
          ↓
Tracking Wrappers (tracking.ts)
          ↓
Context Helpers (amplitudeContext.ts)
          ↓
Amplitude SDK (services/analytics/amplitude)
          ↓
api2.amplitude.com
```

### Arquivos Criados/Modificados

#### Novos Arquivos (dentro de `src/utils/analytics/`)

| Arquivo | Propósito |
|---------|-----------|
| `amplitudeContext.ts` | Helpers para sanitização, validação, merge de propriedades |
| `amplitudeEvents.ts` | Catálogo de eventos padronizados (AMPLITUDE_EVENTS, schemas) |
| `tracking.ts` | Wrappers de alto nível (trackPageViewed, trackCtaClicked, etc) |
| `index.ts` | Barrel exports para facilitar importações |
| `TRACKING_GUIDE.ts` | Documentação detalhada com exemplos |
| `__tests__/amplitudeContext.test.ts` | 20+ testes de sanitização e validação |

#### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/hooks/useAnalytics.ts` | Refatorado para usar wrappers de tracking.ts, nomes padronizados |
| `src/hooks/useSectionView.ts` | Atualizado para passar section_id + section_name, page_name inferido |
| `src/pages/Landing/Controller/index.tsx` | Atualizar imports e chamadas para novos nomes de função |

---

## 🎯 Eventos Padronizados

### 13 Eventos Principais

| Evento | Properties Obrigatórias | Exemplo |
|--------|------------------------|---------|
| **page_viewed** | `page_name` | `trackPageViewed("landing")` |
| **section_viewed** | `page_name`, `section_id`, `section_name` | `trackSectionViewed("landing", "features-section", "features")` |
| **navigation_link_clicked** | `page_name`, `link_text`, `href` | `trackNavigationLinkClicked("landing", "About", "/about")` |
| **navigation_menu_toggled** | `action` | `trackNavigationMenuToggled("open", "mobile_menu")` |
| **cta_clicked** | `page_name`, `cta_id` | `trackCtaClicked("landing", "hero_primary")` |
| **form_started** | `page_name`, `form_id` | `trackFormStarted("landing", "signup_check")` |
| **form_submitted** | `page_name`, `form_id` | `trackFormSubmitted("landing", "signup_check")` |
| **form_success** | `page_name`, `form_id` | `trackFormSuccess("landing", "signup_registration")` |
| **form_error** | `page_name`, `form_id`, `error_type` | `trackFormError("landing", "signup_check", "validation_error")` |
| **gallery_viewed** | `page_name` | `trackGalleryViewed()` |
| **gallery_album_clicked** | (nenhuma obrigatória) | `trackGalleryAlbumClicked(2024, "Summer")` |
| **external_link_clicked** | (nenhuma obrigatória) | `trackExternalLinkClicked("instagram")` |
| **error_occurred** | `error_type` | `trackErrorOccurred("form_validation", "Email invalid")` |

---

## 🔐 LGPD - Sanitização Automática

### Propriedades Proibidas (Removidas Automaticamente)

Chaves que contêm os seguintes termos são filtradas:

- **Identificação**: email, cpf, cnpj, name, fullName
- **Localização**: address, number, complement, city, state, cep, zipCode
- **Contato**: phone, telephone, mobile, cellphone
- **Pagamento**: card_number, cvv, bankAccount, agencyNumber
- **QR Code**: qrCodeText, qrCode
- **Autenticação**: password, token, apiKey, secret
- **Dispositivo**: ipAddress, deviceId, idfa, aaid

### Exemplo

```typescript
const props = {
  form_id: "signup_check",
  email: "user@example.com",  // ❌ Removido
  cpf: "123.456.789-00",       // ❌ Removido
  phone: "11999999999",         // ❌ Removido
};

const safe = sanitizeProps(props);
// Resultado: { form_id: "signup_check" }
// [Dev] Warning: "PII detected in event properties: email, cpf, phone"
```

---

## 💻 Como Usar

### Em um Componente React

```typescript
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSectionView } from "@/hooks/useSectionView";

const LandingPage: React.FC = () => {
  const { pageViewed, ctaClicked } = useAnalytics();

  // Rastrear visualização de página
  useEffect(() => {
    pageViewed("landing");
  }, []);

  return (
    <>
      <section id="hero-section">
        <button onClick={() => ctaClicked("landing", "hero_primary")}>
          Get Started
        </button>
      </section>

      <FeaturesSection />
    </>
  );
};

const FeaturesSection: React.FC = () => {
  // Rastrear automaticamente quando seção fica visível
  useSectionView("features-section", "features");

  return <section id="features-section">...</section>;
};
```

### Importar Funções Diretas (se preferir não usar hook)

```typescript
import {
  trackPageViewed,
  trackCtaClicked,
  trackFormSubmitted,
} from "@/utils/analytics";

// Usar diretamente
trackPageViewed("landing");
trackCtaClicked("landing", "hero_primary");
```

### Contexto de Página (Automático)

Todas as funções injetam automaticamente:

```typescript
trackCtaClicked("landing", "hero_primary");

// Emite internamente:
{
  event_name: "cta_clicked",
  properties: {
    page_name: "landing",           // ← Fornecido
    cta_id: "hero_primary",          // ← Fornecido
    route: "/",                       // ← Injetado (window.location.pathname)
    timestamp: 1234567890,            // ← Injetado (Date.now() / 1000)
    referrer: "https://google.com"    // ← Injetado (document.referrer)
  }
}
```

---

## 📊 Dashboards Amplitude

### Problema Resolvido

**ANTES** (muitos eventos específicos, difícil filtrar):
```
Events: cta_clicked_hero_primary, cta_clicked_hero_secondary, 
        cta_clicked_feature_cta_1, cta_clicked_feature_cta_2, ...
```

**DEPOIS** (um evento genérico, fácil filtrar via properties):
```
Event: cta_clicked
Filter by: event_properties[cta_id] = "hero_primary"
```

### Exemplos de Filtros

1. **"Quantos CTAs foram clicados?"**
   ```
   Event Name = "cta_clicked"
   ```

2. **"Quantos cliques especificamente no hero primary?"**
   ```
   Event Name = "cta_clicked" 
   AND event_properties[cta_id] = "hero_primary"
   ```

3. **"Qual foi a taxa de erro por campo?"**
   ```
   Event Name = "form_error"
   AND event_properties[form_id] = "signup_check"
   Group By: event_properties[field_name]
   ```

4. **"Quais seções têm maior engagement?"**
   ```
   Event Name = "section_viewed"
   AND event_properties[page_name] = "landing"
   Group By: event_properties[section_name]
   ```

5. **"Funil de conversão: Check → Registration → Success"**
   ```
   Step 1: form_submitted WHERE form_id = "signup_check"
   Step 2: form_submitted WHERE form_id = "signup_registration"
   Step 3: form_success WHERE form_id = "signup_registration"
   ```

---

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes de analytics
npm test -- amplitudeContext

# Com coverage
npm test -- amplitudeContext --coverage
```

### O Que é Testado

- ✅ Remoção de 15+ tipos de PII
- ✅ Merge de propriedades com sanitização
- ✅ Injeção de contexto de página
- ✅ Validação de eventos (dev mode)
- ✅ Remoção de valores undefined/null/empty
- ✅ Preservação de tipos de dados

### Exemplo de Teste

```typescript
it("deve remover propriedades sensíveis", () => {
  const props = {
    email: "user@example.com",
    phone: "11999999999",
    action: "click",
  };

  const result = sanitizeProps(props);

  expect(result).toEqual({ action: "click" });
  expect(result.email).toBeUndefined();
  expect(result.phone).toBeUndefined();
});
```

---

## 📝 Mudanças no Landing Controller

### Antes

```typescript
const { trackPageView, trackSignupSubmitted, trackCtaHeroClick } = useAnalytics();

trackPageView("Landing", "/");
trackSignupSubmitted("check");
trackCtaHeroClick("primary");
```

### Depois

```typescript
const { pageViewed, formSubmitted, ctaClicked } = useAnalytics();

pageViewed("landing", "/");
formSubmitted("landing", "signup_check", "pending");
ctaClicked("landing", "hero_primary", "Check Reservation", "signup_check");
```

---

## ✨ Benefícios

### Para Analytics

| Benefício | Antes | Depois |
|-----------|-------|--------|
| **Escalabilidade** | Novo CTA = novo evento | Novo CTA = novo valor de prop |
| **Filtros no Dashboard** | Difícil: precisa de múltiplos eventos | Fácil: um evento + filter por prop |
| **Funis de Conversão** | Manual, complexo | Automático, baseado em form_id |
| **Relatórios** | Inflexíveis | Flexíveis (agrupar por qualquer prop) |
| **LGPD** | Manual em cada place | Automático em todas chamadas |

### Para Desenvolvimento

| Benefício | Como |
|-----------|------|
| **Type-safe** | TypeScript com AmplitudeEventProperties |
| **Menos duplicação** | Sanitização em um lugar (amplitudeContext.ts) |
| **Validação em dev** | Console warnings para props faltantes |
| **Fácil debug** | Propriedades normalizadas, timestamp automático |
| **Testável** | Helpers puros com testes isolados |

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [amplitudeContext.ts](./amplitudeContext.ts) | Helpers + JSDoc detalhado |
| [amplitudeEvents.ts](./amplitudeEvents.ts) | Schemas e tipos |
| [tracking.ts](./tracking.ts) | Wrappers com 14 funções |
| [TRACKING_GUIDE.ts](./TRACKING_GUIDE.ts) | Guia completo com 13+ exemplos |

---

## 🚀 Próximos Passos

- [ ] Executar testes: `npm test -- amplitudeContext`
- [ ] Verificar eventos no dashboard Amplitude
- [ ] Criar dashboards com novos filtros
- [ ] Documentar CTAs adicionais conforme surgem
- [ ] Considerar user_id anonimizado (não implementado agora)

---

## ❓ Dúvidas

Ver [TRACKING_GUIDE.ts](./TRACKING_GUIDE.ts) para:
- Todos os 13 eventos com propriedades
- 10+ exemplos práticos
- Padrões de filtros Amplitude
- Lista completa de PII proibido
