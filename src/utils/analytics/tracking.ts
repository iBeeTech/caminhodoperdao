/**
 * Wrappers de alto nível para Amplitude
 * 
 * Funções convenientes que encapsulam a lógica de propriedades obrigatórias
 * Simplifica o uso em componentes React
 * 
 * Use essas funções em vez de chamar trackEvent diretamente
 */

import { trackEvent } from "../../services/analytics/amplitude";
import { AMPLITUDE_EVENTS, type AmplitudeEventProperties } from "./amplitudeEvents";
import { prepareEventProperties } from "./amplitudeContext";

/**
 * Rastrear visualização de página
 * 
 * @param pageName - Nome da página (ex: "landing", "gallery")
 * @param route - Rota customizada (default: window.location.pathname)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackPageViewed("landing");
 * trackPageViewed("gallery", "/gallery/2024");
 */
export function trackPageViewed(
  pageName: string,
  route?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.PAGE_VIEWED,
    pageName,
    {
      route,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.PAGE_VIEWED, props);
}

/**
 * Rastrear visualização de seção
 * 
 * Chamado automaticamente por useSectionView quando seção fica visível
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param sectionId - ID único da seção (ex: "hero-section")
 * @param sectionName - Nome legível da seção (ex: "hero", "testimonials")
 * @param position - Posição na página (ex: "top", "middle", "bottom")
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackSectionViewed("landing", "features-section", "features", "middle");
 */
export function trackSectionViewed(
  pageName: string,
  sectionId: string,
  sectionName: string,
  position?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.SECTION_VIEWED,
    pageName,
    {
      section_id: sectionId,
      section_name: sectionName,
      position,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.SECTION_VIEWED, props);
}

/**
 * Rastrear visualização de seção de formulário
 */
export function trackFormSectionViewed(
  pageName: string,
  sectionId: string,
  sectionName: string,
  position?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.FORM_SECTION_VIEWED,
    pageName,
    {
      section_id: sectionId,
      section_name: sectionName,
      position,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.FORM_SECTION_VIEWED, props);
}

/**
 * Rastrear clique em link de navegação
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param linkText - Texto do link (ex: "About")
 * @param href - URL do link (ex: "/about")
 * @param location - Localização do link (ex: "header", "footer", "mobile_menu")
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackNavigationLinkClicked("landing", "About", "/about", "header");
 */
export function trackNavigationLinkClicked(
  pageName: string,
  linkText: string,
  href: string,
  location?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.NAVIGATION_LINK_CLICKED,
    pageName,
    {
      link_text: linkText,
      href,
      location,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.NAVIGATION_LINK_CLICKED, props);
}

/**
 * Rastrear abertura/fechamento de menu de navegação
 * 
 * @param action - Ação realizada ("open", "close", "toggle")
 * @param location - Localização do menu (ex: "mobile_menu")
 * @param pageName - Nome da página (opcional)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackNavigationMenuToggled("open", "mobile_menu", "landing");
 */
export function trackNavigationMenuToggled(
  action: "open" | "close" | "toggle",
  location?: string,
  pageName?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.NAVIGATION_MENU_TOGGLED,
    pageName,
    {
      action,
      location,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.NAVIGATION_MENU_TOGGLED, props);
}

/**
 * Rastrear clique em CTA (Call-To-Action)
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param ctaId - ID do CTA (ex: "hero_primary", "feature_main")
 * @param ctaText - Texto do botão (opcional)
 * @param destination - Para onde leva o CTA (ex: "registration", "about")
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackCtaClicked("landing", "hero_primary", "Get Started", "registration");
 */
export function trackCtaClicked(
  pageName: string,
  ctaId: string,
  ctaText?: string,
  destination?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.CTA_CLICKED,
    pageName,
    {
      cta_id: ctaId,
      cta_text: ctaText,
      destination,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.CTA_CLICKED, props);
}

/**
 * Rastrear início de preenchimento de formulário
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param formId - ID do formulário (ex: "signup_check", "contact")
 * @param formStep - Passo do formulário (para multi-step)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackFormStarted("landing", "signup_check");
 */
export function trackFormStarted(
  pageName: string,
  formId: string,
  formStep?: number | string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.FORM_STARTED,
    pageName,
    {
      form_id: formId,
      form_step: formStep,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.FORM_STARTED, props);
}

/**
 * Rastrear submissão de formulário
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param formId - ID do formulário (ex: "signup_check")
 * @param status - Status da submissão (ex: "success", "pending")
 * @param formStep - Passo do formulário (para multi-step)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackFormSubmitted("landing", "signup_check", "pending");
 */
export function trackFormSubmitted(
  pageName: string,
  formId: string,
  status?: string,
  formStep?: number | string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.FORM_SUBMITTED,
    pageName,
    {
      form_id: formId,
      status,
      form_step: formStep,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.FORM_SUBMITTED, props);
}

/**
 * Rastrear sucesso no processamento de formulário
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param formId - ID do formulário (ex: "signup_registration")
 * @param status - Status resultante (ex: "check_confirmed", "registration_complete")
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackFormSuccess("landing", "signup_registration", "registration_complete");
 */
export function trackFormSuccess(
  pageName: string,
  formId: string,
  status?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.FORM_SUCCESS,
    pageName,
    {
      form_id: formId,
      status,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.FORM_SUCCESS, props);
}

/**
 * Rastrear erro no processamento de formulário
 * 
 * ⚠️ IMPORTANTE: error_message nunca deve conter dados sensíveis (email, cpf, etc)
 * Use apenas error_type genérico (ex: "validation_error", "api_error")
 * 
 * @param pageName - Nome da página (ex: "landing")
 * @param formId - ID do formulário (ex: "signup_check")
 * @param errorType - Tipo de erro (ex: "validation_error", "network_error")
 * @param fieldName - Campo com erro (opcional)
 * @param additionalProps - Propriedades extras (sem dados sensíveis!)
 * 
 * @example
 * trackFormError("landing", "signup_check", "validation_error", "email");
 */
export function trackFormError(
  pageName: string,
  formId: string,
  errorType: string,
  fieldName?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.FORM_ERROR,
    pageName,
    {
      form_id: formId,
      error_type: errorType,
      field_name: fieldName,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.FORM_ERROR, props);
}

/**
 * Rastrear visualização de galeria
 * 
 * @param route - Rota customizada (default: window.location.pathname)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackGalleryViewed("/gallery");
 */
export function trackGalleryViewed(
  route?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.GALLERY_VIEWED,
    "gallery",
    {
      route,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.GALLERY_VIEWED, props);
}

/**
 * Rastrear clique em álbum na galeria
 * 
 * @param albumYear - Ano do álbum (ex: 2024)
 * @param albumName - Nome do álbum (opcional)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackGalleryAlbumClicked(2024, "Summer Retreat");
 */
export function trackGalleryAlbumClicked(
  albumYear: number,
  albumName?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.GALLERY_ALBUM_CLICKED,
    "gallery",
    {
      album_year: albumYear,
      album_name: albumName,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.GALLERY_ALBUM_CLICKED, props);
}

/**
 * Rastrear clique em link externo/rede social
 * 
 * @param platform - Plataforma (ex: "instagram", "facebook", "external")
 * @param url - URL do link (opcional, para links não-sociais)
 * @param linkText - Texto do link (opcional)
 * @param pageName - Página onde o link foi clicado (opcional)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackExternalLinkClicked("instagram", undefined, "Follow us");
 */
export function trackExternalLinkClicked(
  platform: string,
  url?: string,
  linkText?: string,
  pageName?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.EXTERNAL_LINK_CLICKED,
    pageName,
    {
      platform,
      url,
      link_text: linkText,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.EXTERNAL_LINK_CLICKED, props);
}

/**
 * Rastrear erro na aplicação
 * 
 * ⚠️ IMPORTANTE: error_message nunca deve conter dados sensíveis
 * Use apenas mensagens genéricas ou error codes
 * 
 * @param errorType - Tipo do erro (ex: "form_validation", "api_error", "permission_error")
 * @param errorMessage - Mensagem genérica (sem PII!)
 * @param context - Contexto adicional (ex: "landing_signup")
 * @param pageName - Nome da página (opcional)
 * @param additionalProps - Propriedades extras
 * 
 * @example
 * trackErrorOccurred("form_validation", "Email format invalid", "landing_signup");
 */
export function trackErrorOccurred(
  errorType: string,
  errorMessage?: string,
  context?: string,
  pageName?: string,
  additionalProps?: Partial<AmplitudeEventProperties>
): void {
  const props = prepareEventProperties(
    AMPLITUDE_EVENTS.ERROR_OCCURRED,
    pageName,
    {
      error_type: errorType,
      error_message: errorMessage,
      context,
      ...additionalProps,
    }
  );
  trackEvent(AMPLITUDE_EVENTS.ERROR_OCCURRED, props);
}
