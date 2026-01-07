/**
 * Context helpers para Amplitude Analytics
 * 
 * Fornece funções utilitárias para:
 * - Extrair contexto de página automaticamente
 * - Sanitizar propriedades (remover PII)
 * - Mesclar e validar propriedades de evento
 * 
 * LGPD-compliant: Remove automaticamente dados sensíveis
 */

/**
 * Lista de chaves que contêm dados sensíveis (PII) e devem ser filtradas
 * Amplitude-friendly approach: remover no client-side antes de enviar
 */
export const PROHIBITED_KEYS = [
  // Identificação pessoal
  "email",
  "cpf",
  "cnpj",
  "name",
  "fullName",
  "full_name",
  
  // Localização / Endereço
  "address",
  "number",
  "complement",
  "city",
  "state",
  "cep",
  "zipCode",
  "zip_code",
  "latitude",
  "longitude",
  "coordinates",
  
  // Telefone
  "phone",
  "telephone",
  "mobile",
  "cellphone",
  "cell_phone",
  
  // Dados de Pagamento
  "card_number",
  "cardNumber",
  "cvv",
  "cvc",
  "cardholderName",
  "cardholder_name",
  "bankAccount",
  "bank_account",
  "bankCode",
  "bank_code",
  "agencyNumber",
  "agency_number",
  
  // QR Code e tokens
  "qrCodeText",
  "qr_code_text",
  "qrCode",
  "qr_code",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "secret",
  
  // Dados de autenticação
  "password",
  "passwd",
  "pin",
  "biometric",
  
  // Localização do dispositivo / IP
  "ipAddress",
  "ip_address",
  "deviceId",
  "device_id",
  "advertisingId",
  "advertising_id",
  "idfa",
  "aaid",
];

/**
 * Interface para contexto de página
 */
export interface PageContext {
  page_name?: string;
  route?: string;
  referrer?: string;
}

/**
 * Extrair contexto da página baseado em window.location e route param
 * 
 * Tenta inferir page_name da rota se não fornecido
 * 
 * @param pageName - Nome da página (ex: "landing", "gallery")
 * @param route - Rota/pathname customizado (default: window.location.pathname)
 * @returns Objeto com page_name, route e referrer
 * 
 * @example
 * // Em um componente de página
 * const context = getPageContext("landing");
 * // { page_name: "landing", route: "/", referrer: "..." }
 */
export function getPageContext(pageName?: string, route?: string): PageContext {
  // Safety: só executar no cliente
  if (typeof window === "undefined") {
    return {};
  }

  return {
    page_name: pageName,
    route: route || window.location.pathname,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
  };
}

/**
 * Verificar se uma chave contém dados sensíveis
 * 
 * @param key - Nome da chave a verificar
 * @returns true se a chave é proibida
 */
export function isProhibitedKey(key: string): boolean {
  return PROHIBITED_KEYS.some((prohibited) =>
    key.toLowerCase().includes(prohibited.toLowerCase())
  );
}

/**
 * Sanitizar propriedades removendo PII
 * 
 * Filtra chaves que contêm dados sensíveis segundo PROHIBITED_KEYS
 * Emite warning em dev se detectar tentativa de envio de PII
 * 
 * @param props - Objeto com propriedades de evento
 * @returns Objeto sanitizado sem chaves proibidas
 * 
 * @example
 * const props = { email: "user@example.com", action: "click" };
 * const safe = sanitizeProps(props);
 * // { action: "click" }
 * // [Dev] console.warn: "PII detected in event properties: email"
 */
export function sanitizeProps(
  props?: Record<string, any>
): Record<string, any> {
  if (!props) return {};

  const sanitized: Record<string, any> = {};
  const detectedPII: string[] = [];

  Object.entries(props).forEach(([key, value]) => {
    if (isProhibitedKey(key)) {
      detectedPII.push(key);
    } else {
      sanitized[key] = value;
    }
  });

  // Warning em dev se detectar PII
  if (
    detectedPII.length > 0 &&
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    console.warn(
      `[Amplitude] PII detected and filtered: ${detectedPII.join(", ")}`
    );
  }

  return sanitized;
}

/**
 * Mesclar propriedades garantindo snake_case e removendo PII
 * 
 * Combina pageContext + extraProps + sanitiza tudo junto
 * Propriedades vazias/undefined são removidas
 * 
 * @param pageContext - Contexto de página (page_name, route, referrer)
 * @param extraProps - Propriedades extras do evento
 * @returns Objeto final com todas as propriedades sanitizadas
 * 
 * @example
 * const context = { page_name: "landing", route: "/" };
 * const props = { action: "click", email: "user@example.com" };
 * const merged = mergeProps(context, props);
 * // { page_name: "landing", route: "/", action: "click" }
 * // email foi removida automaticamente
 */
export function mergeProps(
  pageContext?: PageContext,
  extraProps?: Record<string, any>
): Record<string, any> {
  const merged = {
    ...pageContext,
    ...extraProps,
  };

  // Sanitizar tudo junto
  const sanitized = sanitizeProps(merged);

  // Remover undefined/null/empty string
  const cleaned: Record<string, any> = {};
  Object.entries(sanitized).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

/**
 * Validar que um evento tem propriedades mínimas obrigatórias
 * 
 * Usado em dev para verificar que os eventos estão sendo enviados corretamente
 * Não bloqueia envio, apenas faz warning
 * 
 * @param eventName - Nome do evento
 * @param props - Propriedades do evento
 * 
 * @example
 * // Em dev, se section_viewed sem section_name:
 * validateEventProperties("section_viewed", { page_name: "landing" });
 * // [Dev] console.warn: "section_viewed is missing required property: section_name"
 */
export function validateEventProperties(
  eventName: string,
  props?: Record<string, any>
): void {
  if (
    typeof process === "undefined" ||
    process.env.NODE_ENV !== "development"
  ) {
    return;
  }

  if (!props) props = {};

  const requiredByEvent: Record<string, string[]> = {
    page_viewed: ["page_name"],
    section_viewed: ["page_name", "section_name", "section_id"],
    navigation_link_clicked: ["page_name", "link_text", "href"],
    cta_clicked: ["page_name", "cta_id"],
    form_started: ["page_name", "form_id"],
    form_submitted: ["page_name", "form_id"],
    form_success: ["page_name", "form_id"],
    form_error: ["page_name", "form_id", "error_type"],
    error_occurred: ["error_type"],
  };

  const required = requiredByEvent[eventName];
  if (!required) return; // Evento não tem validação definida

  const missing: string[] = [];
  required.forEach((key) => {
    if (!props![key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.warn(
      `[Amplitude] Event "${eventName}" is missing required properties: ${missing.join(", ")}`
    );
  }
}

/**
 * Preparar propriedades completas de um evento
 * 
 * Função "one-stop" que:
 * 1. Pega contexto de página
 * 2. Mescla com props extras
 * 3. Sanitiza tudo
 * 4. Valida em dev
 * 5. Adiciona timestamp
 * 
 * @param eventName - Nome do evento (para validação)
 * @param pageName - Nome da página (quando aplicável)
 * @param extraProps - Propriedades extras do evento
 * @returns Props finais prontas para trackEvent
 * 
 * @example
 * const props = prepareEventProperties("cta_clicked", "landing", {
 *   cta_id: "hero_primary",
 *   email: "user@example.com" // será removido
 * });
 * // { page_name: "landing", route: "/", cta_id: "hero_primary", timestamp: 1234567890 }
 */
export function prepareEventProperties(
  eventName: string,
  pageName?: string,
  extraProps?: Record<string, any>
): Record<string, any> {
  const pageContext = getPageContext(pageName);
  const merged = mergeProps(pageContext, extraProps);
  
  // Validar em dev
  validateEventProperties(eventName, merged);

  // Adicionar timestamp
  const withTimestamp = {
    ...merged,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return withTimestamp;
}
