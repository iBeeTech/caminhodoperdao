# 📊 Guia: Importar Tracking Plan no Amplitude

## 📁 Arquivo Gerado

O script gerou um arquivo CSV no diretório `tracking/`:

```
tracking/amplitude-import.csv
```

Este arquivo está **no formato hierárquico esperado pelo Amplitude** e contém:
- 30 colunas (conforme template oficial)
- 1 Property Group "Common-Properties" com todas as propriedades
- 14 eventos com suas propriedades required
- Estrutura compatível com o import do Amplitude

---

## 🚀 Como Importar no Amplitude Dashboard

### Passo 1: Acessar o Amplitude

1. Faça login em [https://analytics.amplitude.com](https://analytics.amplitude.com)
2. Selecione seu projeto
3. Vá para **Data** > **Catalog** (lado esquerdo)

### Passo 2: Iniciar o Import

1. Clique em **Import** (botão superior)
2. Clique em **"Import Events and Event Properties"**

### Passo 3: Upload do CSV

1. Na seção "Choose File", selecione **`tracking/amplitude-import.csv`**
2. O Amplitude validará o arquivo e mostrará uma preview
3. Verifique se todos os eventos e propriedades aparecem corretamente

### Passo 4: Confirmar Import

1. Clique em **"Import"** para confirmar
2. Aguarde a confirmação de sucesso ✅

---

## 📋 Estrutura do CSV Gerado

### Colunas do CSV (30 colunas)
```
Action
Object Type
Object Name
Event Display Name
Object Description
Event Category
Tags
Event Activity
Event Hidden From Dropdowns
Event Hidden From Persona Results
Event Hidden From Pathfinder
Event Hidden From Timeline
Event Source
Property Type
Property Group Names
Event Property Name
Property Description
Property Value Type
Property Required
Property Visibility
Property Is Array
Enum Values
Property Regex
Const Value
String Property Value Min Length
String Property Value Max Length
Number Property Value Min
Number Property Value Max
Array Min Items
Array Max Items
```

### Estrutura Hierárquica

**Property Group:**
- `Common-Properties` - Contém todas as 26 propriedades únicas utilizadas

**Eventos (14 no total):**
- `page_viewed` (PAGE)
- `section_viewed` (SECTION)
- `form_section_viewed` (FORMS)
- `navigation_link_clicked` (NAVIGATION)
- `navigation_menu_toggled` (NAVIGATION)
- `cta_clicked` (CTA)
- `form_started` (FORMS)
- `form_submitted` (FORMS)
- `form_success` (FORMS)
- `form_error` (FORMS)
- `gallery_viewed` (GALLERY)
- `gallery_album_clicked` (GALLERY)
- `external_link_clicked` (EXTERNAL)
- `error_occurred` (ERRORS)

---

## 🔄 Regenerar o CSV

Se você fizer mudanças no catálogo de eventos (`src/utils/analytics/amplitudeEvents.ts`), regenere o CSV com:

```bash
npm run tracking:amplitude
```

---

## ✅ Checklist pós-importação

- [ ] Verificar se todos os 14 eventos foram importados
- [ ] Verificar se todas as 26 propriedades foram importadas
- [ ] Revisar as categorias atribuídas a cada evento
- [ ] Confirmar que as propriedades obrigatórias estão marcadas corretamente
- [ ] Testar o rastreamento no aplicativo
- [ ] Validar que os eventos aparecem no Amplitude Debugger

---

## 🔗 Referências

- [Amplitude Data Catalog Documentation](https://www.amplitude.com/docs/data/catalog)
- [Importing Events and Properties](https://www.amplitude.com/docs/data/catalog#import-events-and-event-properties)
- [CSV Import Format Specification](https://www.amplitude.com/docs/data/catalog#csv-import)
