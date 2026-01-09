/**
 * Amplitude Events Registry
 * 
 * Centraliza TODOS os nomes de eventos da aplicação com categorização clara.
 * 
 * ⚠️ LGPD/PRIVACY POLICY
 * ======================
 * ❌ PROHIBITED: email, cpf, phone, full_name, address, payment_data
 * ✅ ALLOWED:   page_name, route, link_text, form_type, user_id (UUID/hash)
 * 
 * Nomenclatura: "Category: Verb Object"
 * Exemplo: "Signup: Submitted Form" → event_name: "signup_submitted_form"
 * 
 * @see https://amplitude.com/docs/analytics/analytics-glossary
 */

/**
 * Tipos de propriedades permitidas
 */
export type AmplitudeEventName = typeof AmplitudeEvents[keyof typeof AmplitudeEvents];

export type AmplitudeEventProperty =
  | "page_name"
  | "route"
  | "component"
  | "section_name"
  | "link_text"
  | "link_href"
  | "button_text"
  | "form_type"
  | "field_name"
  | "action_type"
  | "status"
  | "year"
  | "platform"
  | "error_code"
  | "error_type"
  | "error_message"
  | "label"
  | "value"
  | "user_id"; // UUID ou hash, NEVER raw email/CPF

/**
 * Catálogo de eventos Amplitude
 * Agrupado por categoria, usando formato: "Category: Verb Object"
 * 
 * Convenção de nomes em código: SNAKE_CASE_NO_ESPAÇO
 */
export const AmplitudeEvents = {
  // ============ PAGE VIEWS ============
  "page_viewed":                        "page_viewed",
  
  // ============ NAVIGATION ============
  "navigation_clicked_link":            "navigation_clicked_link",
  "navigation_opened_menu_mobile":      "navigation_opened_menu_mobile",
  "navigation_closed_menu_mobile":      "navigation_closed_menu_mobile",

  // ============ CTA (Call-to-Action) ============
  "cta_clicked_hero_primary":           "cta_clicked_hero_primary",
  "cta_clicked_hero_secondary":         "cta_clicked_hero_secondary",
  "cta_clicked_signup_start":           "cta_clicked_signup_start",

  // ============ SIGNUP / REGISTRATION ============
  "signup_started":                     "signup_started",
  "signup_submitted":                   "signup_submitted",
  "signup_success":                     "signup_success",
  "signup_reserved":                    "signup_reserved",
  "signup_error":                       "signup_error",
  "signup_field_error":                 "signup_field_error",

  // ============ PAYMENT ============
  "payment_initiated":                  "payment_initiated",
  "payment_confirmed":                  "payment_confirmed",
  "payment_expired":                    "payment_expired",
  "payment_error":                      "payment_error",

  // ============ FORM ============
  "form_started":                       "form_started",
  "form_field_changed":                 "form_field_changed",
  "form_field_error":                   "form_field_error",
  "form_submitted":                     "form_submitted",
  "form_success":                       "form_success",

  // ============ GALLERY ============
  "gallery_viewed":                     "gallery_viewed",
  "gallery_clicked_album":              "gallery_clicked_album",

  // ============ SECTION ============
  "section_viewed":                     "section_viewed",

  // ============ EXTERNAL / SOCIAL ============
  "external_clicked_social_link":       "external_clicked_social_link",
  "external_clicked_link":              "external_clicked_link",

  // ============ ERROR HANDLING ============
  "error_occurred":                     "error_occurred",
  "error_network":                      "error_network",
  "error_validation":                   "error_validation",

  // ============ SYSTEM ============
  "system_session_started":             "system_session_started",
  "system_session_ended":               "system_session_ended",
} as const;

/**
 * Interface para propriedades de eventos
 * Garante type-safety sem expor PII
 */
export interface AmplitudeEventProperties {
  // Identificação segura
  page_name?: string;
  route?: string;
  component?: string;
  section_name?: string;

  // Elementos de interface
  link_text?: string;
  link_href?: string;
  button_text?: string;

  // Contexto de formulário
  form_type?: string;
  field_name?: string;

  // Ações e status
  action_type?: string;
  status?: string;
  label?: string;
  value?: string | number;

  // Dados específicos
  year?: number;
  platform?: string;

  // Erros (sem stacktrace sensível)
  error_code?: string;
  error_type?: string;
  error_message?: string;

  // Identificação (apenas UUID/hash NUNCA PII raw)
  user_id?: string;

  // Flexibilidade para outras propriedades (mas sem PII!)
  [key: string]: string | number | boolean | undefined;
}

/**
 * Nomes de propriedades permitidas (whitelist)
 * Use para validação se necessário
 */
export const AllowedEventProperties: (keyof AmplitudeEventProperties)[] = [
  "page_name",
  "route",
  "component",
  "section_name",
  "link_text",
  "link_href",
  "button_text",
  "form_type",
  "field_name",
  "action_type",
  "status",
  "year",
  "platform",
  "error_code",
  "error_type",
  "error_message",
  "label",
  "value",
  "user_id",
];

/**
 * Helper para construir propriedades de eventos com metadados padrão
 * 
 * Adiciona automaticamente: page_name, route, component (se possível)
 * Filtra propriedades sensíveis (PII)
 * 
 * @param pageName - Nome da página (obrigatório)
 * @param baseProps - Propriedades customizadas (são mescladas)
 * @returns Propriedades prontas para enviar ao Amplitude
 * 
 * @example
 * const props = buildEventProps("Landing", {
 *   form_type: "registration",
 *   section_name: "hero"
 * });
 * // Resultado: { page_name: "Landing", form_type: "registration", section_name: "hero" }
 */
export function buildEventProps(
  pageName: string,
  baseProps?: Partial<AmplitudeEventProperties>
): AmplitudeEventProperties {
  const safeProps: AmplitudeEventProperties = {
    page_name: pageName,
    ...baseProps,
  };

  // Filtrar propriedades sensíveis (PII - Personally Identifiable Information)
  const prohibitedKeys = [
    "email",
    "cpf",
    "phone",
    "telefone",
    "nome",
    "full_name",
    "endereco",
    "address",
    "payment",
    "credit_card",
    "cartao",
  ];

  Object.keys(safeProps).forEach((key) => {
    if (prohibitedKeys.some((prohibited) => key.toLowerCase().includes(prohibited))) {
      delete safeProps[key as keyof AmplitudeEventProperties];
      console.warn(
        `[Amplitude] Propriedade sensível bloqueada: "${key}". ` +
        `LGPD/GDPR: não enviar dados pessoais.`
      );
    }
  });

  return safeProps;
}

/**
 * Detecta dinamicamente o nome da página a partir da URL/rota
 * Útil para páginas que não passam pageName explicitamente
 * 
 * @example
 * const pageName = getPageNameFromRoute("/gallery/albums");
 * // Resultado: "Gallery"
 */
export function getPageNameFromRoute(route: string): string {
  // Remove barras iniciais/finais e tira parametros
  const cleanRoute = route.replace(/^\/|\/$/g, "").split("/")[0];
  
  const pageMap: Record<string, string> = {
    landing: "Landing",
    "": "Landing", // raiz é landing
    gallery: "Gallery",
    error: "Error",
  };

  return pageMap[cleanRoute] || cleanRoute.charAt(0).toUpperCase() + cleanRoute.slice(1);
}

/**
 * Exemplos de uso (comentado)
 * 
 * @example
 * // Em um componente React
 * import { AmplitudeEvents, buildEventProps, trackEvent } from "@/utils/amplitudeEvents";
 * 
 * const handleSignupClick = () => {
 *   trackEvent(
 *     AmplitudeEvents["signup_started"],
 *     buildEventProps("Landing", { form_type: "registration", section_name: "hero" })
 *   );
 * };
 * 
 * @example
 * // Em um hook customizado
 * const trackPageLoad = (pageName: string) => {
 *   trackEvent(
 *     AmplitudeEvents["page_viewed"],
 *     buildEventProps(pageName, { route: window.location.pathname })
 *   );
 * };
 */
