/**
 * API Pública para Amplitude Analytics
 * 
 * Esta é a interface principal que o resto da aplicação deve usar.
 * Todas as funções são SSR-safe e client-only.
 */

import { amplitudeClient } from "./client";
import { amplitudeConfig, amplitudeInitConfig } from "./config";
import { initAnonymousIdentity } from "../../../utils/analytics/identity";
import type { EventProperties, UserProperties } from "./types";

/**
 * Inicializar Amplitude Analytics
 * 
 * Idempotente: pode ser chamada várias vezes sem duplicar
 * 
 * @example
 * // Em main.tsx ou entry client
 * useEffect(() => {
 *   initAmplitude();
 * }, []);
 */
export async function initAmplitude(): Promise<void> {
  // Safety: não executar no server
  if (typeof window === "undefined") {
    return;
  }

  // Se desabilitado ou sem API key
  if (!amplitudeConfig.enabled || !amplitudeConfig.apiKey) {
    console.debug("[Amplitude] Disabled or no API key provided");
    return;
  }

  try {
    await amplitudeClient.init(amplitudeConfig.apiKey, amplitudeInitConfig);
    initAnonymousIdentity();
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] Successfully initialized");
    }
  } catch (error) {
    // Não lançar erro: analytics não deve quebrar a app
    console.error("[Amplitude] Failed to initialize:", error);
  }
}

/**
 * Rastrear evento customizado
 * 
 * Seguro mesmo se Amplitude ainda não foi inicializado (enfileira)
 * 
 * @param eventName - Nome do evento (use amplitude_events para type-safety)
 * @param properties - Propriedades adicionais (opcional)
 * 
 * @example
 * trackEvent(amplitude_events.NAVIGATION_LINK_CLICKED, {
 *   link_name: "Home",
 *   href: "/",
 * });
 */
export function trackEvent(
  eventName: string,
  properties?: EventProperties
): void {
  // Safety: não executar no server
  if (typeof window === "undefined") {
    return;
  }

  // Se desabilitado
  if (!amplitudeConfig.enabled) {
    return;
  }

  try {
    amplitudeClient.track(eventName, properties);
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] Event tracked:", eventName, properties);
    }
  } catch (error) {
    console.error("[Amplitude] Error tracking event:", error);
  }
}

/**
 * Definir ID do usuário
 * 
 * Chamar após autenticação/login
 * 
 * @param userId - ID único do usuário (não email puro!)
 * 
 * @example
 * // Após login bem-sucedido
 * setUserId(user.id);
 */
export function setUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!amplitudeConfig.enabled) {
    return;
  }

  try {
    amplitudeClient.setUserId(userId);
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] User ID set:", userId);
    }
  } catch (error) {
    console.error("[Amplitude] Error setting user ID:", error);
  }
}

/**
 * Definir propriedades persistentes do usuário
 * 
 * Estas propriedades serão incluídas em todos os eventos futuros
 * 
 * @param userProperties - Objeto com propriedades do usuário
 * 
 * @example
 * setUserProperties({
 *   language: "pt-BR",
 *   subscription_tier: "premium",
 *   has_sleep_preference: true,
 * });
 * 
 * ⚠️ LGPD: Nunca envie email puro, CPF, dados sensíveis
 */
export function setUserProperties(userProperties: UserProperties): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!amplitudeConfig.enabled) {
    return;
  }

  try {
    amplitudeClient.setUserProperties(userProperties);
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] User properties set:", userProperties);
    }
  } catch (error) {
    console.error("[Amplitude] Error setting user properties:", error);
  }
}

/**
 * Reset do cliente Amplitude (para testes ou logout)
 */
export function resetAmplitude(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    amplitudeClient.reset();
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] Client reset");
    }
  } catch (error) {
    console.error("[Amplitude] Error resetting:", error);
  }
}

/**
 * Rastrear page view manual
 * 
 * Use quando quiser rastrear navegação (já que pageViews automático está desligado)
 * 
 * @param pageName - Nome da página ou rota
 * @param properties - Propriedades adicionais (opcional)
 * 
 * @example
 * // Ao montar componente de página ou ao mudar rota
 * trackPageView("landing");
 * trackPageView("gallery", { album_count: 10 });
 */
export function trackPageView(
  pageName: string,
  properties?: EventProperties
): void {
  trackEvent("page_viewed", {
    page_name: pageName,
    ...properties,
  });
}

// Re-exportar tipos e eventos para conveniência
export { amplitude_events } from "./types";
export type { EventProperties, UserProperties } from "./types";
