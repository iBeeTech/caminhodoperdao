/**
 * Catálogo de eventos padronizado para Amplitude
 * 
 * Segue Amplitude best practices:
 * - Nomes de eventos genéricos + properties específicas
 * - Nomenclatura snake_case
 * - Propriedades obrigatórias e opcionais bem definidas
 * - LGPD-compliant (sem PII)
 * 
 * Event Categories (em inglês para dashboards internacionais):
 * - PAGE VIEWS: Navegação entre páginas
 * - SECTION VIEWS: Scroll/visibilidade de seções
 * - NAVIGATION: Cliques em links e menu
 * - CTA: Call-to-action (buttons, hero actions)
 * - FORMS: Ciclo de vida de formulários
 * - GALLERY: Interações na galeria
 * - EXTERNAL: Links externos/redes sociais
 * - ERRORS: Rastreamento de erros
 */

/**
 * Nome de eventos padronizados (genéricos)
 */
export const AMPLITUDE_EVENTS = {
  // ============ PAGE VIEWS ============
  /** Quando usuário entra em uma página */
  PAGE_VIEWED: "page_viewed",

  // ============ SECTION VIEWS ============
  /** Quando uma seção se torna visível na tela */
  SECTION_VIEWED: "section_viewed",
  /** Quando uma seção de formulário é vista */
  FORM_SECTION_VIEWED: "form_section_viewed",

  // ============ NAVIGATION ============
  /** Clique em um link de navegação */
  NAVIGATION_LINK_CLICKED: "navigation_link_clicked",
  /** Abertura/fechamento do menu mobile */
  NAVIGATION_MENU_TOGGLED: "navigation_menu_toggled",

  // ============ CTA (Call-To-Action) ============
  /** Clique em botão CTA (hero, feature, etc) */
  CTA_CLICKED: "cta_clicked",

  // ============ FORMS ============
  /** Usuário começa a preencher formulário */
  FORM_STARTED: "form_started",
  /** Usuário submete formulário */
  FORM_SUBMITTED: "form_submitted",
  /** Formulário processado com sucesso */
  FORM_SUCCESS: "form_success",
  /** Erro ao processar formulário */
  FORM_ERROR: "form_error",

  // ============ GALLERY ============
  /** Visualiza a página de galeria */
  GALLERY_VIEWED: "gallery_viewed",
  /** Clica em um álbum na galeria */
  GALLERY_ALBUM_CLICKED: "gallery_album_clicked",

  // ============ EXTERNAL / SOCIAL ============
  /** Clique em link externo ou rede social */
  EXTERNAL_LINK_CLICKED: "external_link_clicked",

  // ============ ERRORS ============
  /** Erro genérico na aplicação */
  ERROR_OCCURRED: "error_occurred",
} as const;

/**
 * Propriedades padrão de eventos por tipo
 * Define quais propriedades são obrigatórias e opcionais
 */
export const EVENT_PROPERTIES_SCHEMA = {
  // PAGE_VIEWED: { page_name*, route*, referrer? }
  page_viewed: {
    required: ["page_name"],
    optional: ["route", "referrer"],
    description: "Visualização de página",
  },

  // SECTION_VIEWED: { page_name*, section_id*, section_name*, position? }
  section_viewed: {
    required: ["page_name", "section_id", "section_name"],
    optional: ["position"],
    description: "Seção se tornou visível",
  },

  // FORM_SECTION_VIEWED: { page_name*, section_id*, section_name*, position?, message_camel_case? }
  form_section_viewed: {
    required: ["page_name", "section_id", "section_name"],
    optional: ["position", "message_camel_case"],
    description: "Seção de formulário ficou visível",
  },

  // NAVIGATION_LINK_CLICKED: { page_name*, link_text*, href*, location? }
  navigation_link_clicked: {
    required: ["page_name", "link_text", "href"],
    optional: ["location"],
    description: "Clique em link de navegação",
  },

  // NAVIGATION_MENU_TOGGLED: { action*, location }
  navigation_menu_toggled: {
    required: ["action"],
    optional: ["location"],
    description: "Menu aberto/fechado",
  },

  // CTA_CLICKED: { page_name*, cta_id*, cta_text?, destination? }
  cta_clicked: {
    required: ["page_name", "cta_id"],
    optional: ["cta_text", "destination", "section_id", "section_name", "position", "component_name"],
    description: "Clique em CTA",
  },

  // FORM_STARTED: { page_name*, form_id*, form_step? }
  form_started: {
    required: ["page_name", "form_id"],
    optional: ["form_step"],
    description: "Formulário começou a ser preenchido",
  },

  // FORM_SUBMITTED: { page_name*, form_id*, form_step?, status? }
  form_submitted: {
    required: ["page_name", "form_id"],
    optional: ["form_step", "status"],
    description: "Formulário foi enviado",
  },

  // FORM_SUCCESS: { page_name*, form_id*, status }
  form_success: {
    required: ["page_name", "form_id"],
    optional: ["status", "form_step"],
    description: "Formulário processado com sucesso",
  },

  // FORM_ERROR: { page_name*, form_id*, error_type*, field_name?, form_step? }
  form_error: {
    required: ["page_name", "form_id", "error_type"],
    optional: ["field_name", "form_step"],
    description: "Erro ao processar formulário",
  },

  // GALLERY_VIEWED: { page_name*, route? }
  gallery_viewed: {
    required: ["page_name"],
    optional: ["route"],
    description: "Visualização de galeria",
  },

  // GALLERY_ALBUM_CLICKED: { page_name*, album_year, album_name? }
  gallery_album_clicked: {
    required: ["page_name"],
    optional: ["album_year", "album_name"],
    description: "Clique em álbum da galeria",
  },

  // EXTERNAL_LINK_CLICKED: { page_name?, link_text?, url?, platform? }
  external_link_clicked: {
    required: [],
    optional: ["page_name", "link_text", "url", "platform"],
    description: "Clique em link externo",
  },

  // ERROR_OCCURRED: { error_type*, error_message?, context?, page_name? }
  error_occurred: {
    required: ["error_type"],
    optional: ["error_message", "context", "page_name"],
    description: "Erro na aplicação",
  },
} as const;

/**
 * Type-safe event names
 */
export type AmplitudeEventName = typeof AMPLITUDE_EVENTS[keyof typeof AMPLITUDE_EVENTS];

/**
 * Propriedades de evento (genéricas)
 */
export interface AmplitudeEventProperties {
  // Contexto comum
  page_name?: string;
  route?: string;
  referrer?: string;
  timestamp?: number;
  
  // Navegação
  link_text?: string;
  href?: string;
  location?: "header" | "footer" | "mobile_menu" | string;
  
  // Seções
  section_id?: string;
  section_name?: string;
  position?: "top" | "middle" | "bottom" | string;
  message_camel_case?: string;
  
  // CTA
  cta_id?: string;
  cta_text?: string;
  destination?: string;
  component_name?: string;
  
  // Formulários
  form_id?: string;
  form_step?: number | string;
  field_name?: string;
  status?: "success" | "error" | "pending" | string;
  
  // Galeria
  album_year?: number;
  album_name?: string;
  
  // Erros
  error_type?: string;
  error_message?: string;
  error_code?: string;
  context?: string;
  
  // Menu
  action?: "open" | "close" | "toggle" | string;
  
  // Genéricas
  platform?: string;
  url?: string;
  [key: string]: any;
}
