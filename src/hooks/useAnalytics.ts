/**
 * Hook customizado para rastreamento de eventos (REFATORADO)
 * 
 * Usa a nova arquitetura de eventos com propriedades padronizadas:
 * - Nomes de eventos genéricos (page_viewed, section_viewed, cta_clicked, etc)
 * - Propriedades em snake_case seguindo padrões Amplitude
 * - Sanitização automática de PII (LGPD)
 * - Context injection automático (page_name, route, timestamp)
 * 
 * @example
 * const { trackPageViewed, trackCtaClicked } = useAnalytics();
 * 
 * // Em um componente de página
 * useEffect(() => {
 *   trackPageViewed("landing");
 * }, []);
 * 
 * // Em um botão CTA
 * <button onClick={() => trackCtaClicked("landing", "hero_primary")}>
 *   Get Started
 * </button>
 */

import {
  trackPageViewed,
  trackSectionViewed,
  trackNavigationLinkClicked,
  trackNavigationMenuToggled,
  trackCtaClicked,
  trackFormStarted,
  trackFormSubmitted,
  trackFormSuccess,
  trackFormError,
  trackGalleryViewed,
  trackGalleryAlbumClicked,
  trackExternalLinkClicked,
  trackErrorOccurred,
} from "../utils/analytics/tracking";
import type { AmplitudeEventProperties } from "../utils/analytics/amplitudeEvents";

export const useAnalytics = () => {
  // ============ PAGE VIEWS ============
  
  /**
   * Rastrear visualização de página
   * 
   * Emite: page_viewed
   * 
   * @example
   * trackPageViewed("landing");
   * trackPageViewed("gallery", "/gallery/2024");
   */
  const pageViewed = (
    pageName: string,
    route?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackPageViewed(pageName, route, additionalProps);

  // ============ CTA EVENTS ============

  /**
   * Rastrear clique em CTA (Call-To-Action)
   * 
   * Emite: cta_clicked
   * 
   * @param pageName - Nome da página (ex: "landing")
   * @param ctaId - ID do CTA (ex: "hero_primary", "hero_secondary")
   * @param ctaText - Texto do botão (opcional)
   * @param destination - Para onde leva (ex: "registration")
   * 
   * @example
   * trackCtaClicked("landing", "hero_primary", "Get Started", "registration");
   */
  const ctaClicked = (
    pageName: string,
    ctaId: string,
    ctaText?: string,
    destination?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackCtaClicked(pageName, ctaId, ctaText, destination, additionalProps);

  // ============ NAVIGATION ============

  /**
   * Rastrear clique em link de navegação
   * 
   * Emite: navigation_link_clicked
   * 
   * @example
   * trackNavigationLinkClicked("landing", "About", "/about", "header");
   */
  const navigationLinkClicked = (
    pageName: string,
    linkText: string,
    href: string,
    location?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackNavigationLinkClicked(pageName, linkText, href, location, additionalProps);

  /**
   * Rastrear abertura/fechamento de menu mobile
   * 
   * Emite: navigation_menu_toggled
   * 
   * @example
   * trackNavigationMenuToggled("open", "mobile_menu", "landing");
   */
  const navigationMenuToggled = (
    action: "open" | "close" | "toggle",
    location?: string,
    pageName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackNavigationMenuToggled(action, location, pageName, additionalProps);

  // ============ SIGNUP / FORMS ============

  /**
   * Rastrear início de formulário
   * 
   * Emite: form_started
   * 
   * @example
   * trackFormStarted("landing", "signup_check");
   */
  const formStarted = (
    pageName: string,
    formId: string,
    formStep?: number | string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackFormStarted(pageName, formId, formStep, additionalProps);

  /**
   * Rastrear submissão de formulário
   * 
   * Emite: form_submitted
   * 
   * LGPD-safe: não inclui email ou dados sensíveis
   * 
   * @example
   * trackFormSubmitted("landing", "signup_check", "pending");
   */
  const formSubmitted = (
    pageName: string,
    formId: string,
    status?: string,
    formStep?: number | string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackFormSubmitted(pageName, formId, status, formStep, additionalProps);

  /**
   * Rastrear sucesso de formulário
   * 
   * Emite: form_success
   * 
   * @example
   * trackFormSuccess("landing", "signup_registration", "check_confirmed");
   */
  const formSuccess = (
    pageName: string,
    formId: string,
    status?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackFormSuccess(pageName, formId, status, additionalProps);

  /**
   * Rastrear erro em formulário
   * 
   * Emite: form_error
   * 
   * LGPD-safe: error_message nunca deve conter dados sensíveis
   * 
   * @example
   * trackFormError("landing", "signup_check", "validation_error", "email");
   */
  const formError = (
    pageName: string,
    formId: string,
    errorType: string,
    fieldName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackFormError(pageName, formId, errorType, fieldName, additionalProps);

  // ============ GALLERY ============

  /**
   * Rastrear visualização de galeria
   * 
   * Emite: gallery_viewed
   * 
   * @example
   * trackGalleryViewed();
   */
  const galleryViewed = (
    route?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackGalleryViewed(route, additionalProps);

  /**
   * Rastrear clique em álbum
   * 
   * Emite: gallery_album_clicked
   * 
   * @example
   * trackGalleryAlbumClicked(2024, "Summer Retreat");
   */
  const galleryAlbumClicked = (
    albumYear: number,
    albumName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackGalleryAlbumClicked(albumYear, albumName, additionalProps);

  // ============ SECTION ============

  /**
   * Rastrear visualização de seção (ao ficar visível)
   * 
   * Emite: section_viewed
   * 
   * Normalmente chamado por useSectionView automaticamente
   * 
   * @example
   * trackSectionViewed("landing", "features-section", "features", "middle");
   */
  const sectionViewed = (
    pageName: string,
    sectionId: string,
    sectionName: string,
    position?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackSectionViewed(pageName, sectionId, sectionName, position, additionalProps);

  // ============ EXTERNAL / SOCIAL ============

  /**
   * Rastrear clique em link externo ou rede social
   * 
   * Emite: external_link_clicked
   * 
   * @example
   * trackExternalLinkClicked("instagram", undefined, "Follow us");
   * trackExternalLinkClicked("external", "https://example.com", "Read more");
   */
  const externalLinkClicked = (
    platform: string,
    url?: string,
    linkText?: string,
    pageName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackExternalLinkClicked(platform, url, linkText, pageName, additionalProps);

  // ============ ERROR HANDLING ============

  /**
   * Rastrear erro na aplicação
   * 
   * Emite: error_occurred
   * 
   * LGPD-safe: error_message nunca deve conter dados sensíveis
   * 
   * @example
   * trackErrorOccurred("form_validation", "Email format invalid", "landing_signup");
   */
  const errorOccurred = (
    errorType: string,
    errorMessage?: string,
    context?: string,
    pageName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) => trackErrorOccurred(errorType, errorMessage, context, pageName, additionalProps);

  return {
    // Page views
    pageViewed,
    trackPageViewed: pageViewed, // alias para compatibilidade
    
    // CTA
    ctaClicked,
    trackCtaClicked: ctaClicked, // alias
    
    // Navigation
    navigationLinkClicked,
    trackNavigationLinkClicked: navigationLinkClicked, // alias
    navigationMenuToggled,
    trackNavigationMenuToggled: navigationMenuToggled, // alias
    
    // Forms
    formStarted,
    trackFormStarted: formStarted, // alias
    formSubmitted,
    trackFormSubmitted: formSubmitted, // alias
    formSuccess,
    trackFormSuccess: formSuccess, // alias
    formError,
    trackFormError: formError, // alias
    
    // Gallery
    galleryViewed,
    trackGalleryViewed: galleryViewed, // alias
    galleryAlbumClicked,
    trackGalleryAlbumClicked: galleryAlbumClicked, // alias
    
    // Section
    sectionViewed,
    trackSectionViewed: sectionViewed, // alias
    
    // External/Social
    externalLinkClicked,
    trackExternalLinkClicked: externalLinkClicked, // alias
    
    // Errors
    errorOccurred,
    trackErrorOccurred: errorOccurred, // alias
  };
};
