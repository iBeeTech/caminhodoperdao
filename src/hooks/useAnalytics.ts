/**
 * Hook customizado para rastreamento de eventos
 * 
 * Fornece façade com métodos convenientes para eventos específicos
 * Todos SSR-safe (verificam se window existe)
 * 
 * Usa o novo padrão de eventos do AmplitudeEvents com nomenclatura padronizada
 * 
 * @example
 * const { trackPageView, trackSignupSubmitted } = useAnalytics();
 * 
 * trackPageView("Landing", "/");
 * trackSignupSubmitted("registration", { form_type: "registration" });
 */

import { useCallback } from "react";
import { trackEvent } from "../services/analytics/amplitude";
import {
  AmplitudeEvents,
  buildEventProps,
  type AmplitudeEventProperties,
} from "../utils/amplitudeEvents";

export const useAnalytics = () => {
  // ============ PAGE VIEWS ============

  const trackPageView = useCallback(
    (pageName: string, route?: string, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["page_viewed"],
        buildEventProps(pageName, {
          route: route || (typeof window !== "undefined" ? window.location.pathname : undefined),
          ...additionalProps,
        })
      );
    },
    []
  );

  // ============ CTA EVENTS ============

  const trackCtaHeroClick = useCallback(
    (actionType: "primary" | "secondary") => {
      const eventName =
        actionType === "primary"
          ? AmplitudeEvents["cta_clicked_hero_primary"]
          : AmplitudeEvents["cta_clicked_hero_secondary"];
      trackEvent(
        eventName,
        buildEventProps("Landing", { action_type: actionType })
      );
    },
    []
  );

  // ============ NAVIGATION ============

  const trackNavigationClick = useCallback(
    (linkText: string, href: string) => {
      trackEvent(
        AmplitudeEvents["navigation_clicked_link"],
        buildEventProps("Navigation", {
          link_text: linkText,
          link_href: href,
        })
      );
    },
    []
  );

  const trackMobileMenuToggle = useCallback((action: "opened" | "closed") => {
    const eventName =
      action === "opened"
        ? AmplitudeEvents["navigation_opened_menu_mobile"]
        : AmplitudeEvents["navigation_closed_menu_mobile"];
    trackEvent(
      eventName,
      buildEventProps("Navigation", { action_type: action })
    );
  }, []);

  // ============ SIGNUP ============

  const trackSignupStarted = useCallback(
    (formType: "check" | "registration") => {
      trackEvent(
        AmplitudeEvents["signup_started"],
        buildEventProps("Landing", { form_type: formType })
      );
    },
    []
  );

  const trackSignupSubmitted = useCallback(
    (formType: "check" | "registration", additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["signup_submitted"],
        buildEventProps("Landing", {
          form_type: formType,
          ...additionalProps,
        })
      );
    },
    []
  );

  const trackSignupSuccess = useCallback(
    (status: string, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["signup_success"],
        buildEventProps("Landing", {
          status,
          ...additionalProps,
        })
      );
    },
    []
  );

  const trackSignupError = useCallback(
    (errorCode: string, fieldName?: string, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["signup_error"],
        buildEventProps("Landing", {
          error_code: errorCode,
          field_name: fieldName,
          ...additionalProps,
        })
      );
    },
    []
  );

  const trackFormFieldError = useCallback(
    (fieldName: string, errorMessage: string) => {
      trackEvent(
        AmplitudeEvents["form_field_error"],
        buildEventProps("Landing", {
          field_name: fieldName,
          error_message: errorMessage,
        })
      );
    },
    []
  );

  // ============ GALLERY ============

  const trackGalleryView = useCallback((route?: string) => {
    trackEvent(
      AmplitudeEvents["gallery_viewed"],
      buildEventProps("Gallery", {
        route: route || (typeof window !== "undefined" ? window.location.pathname : undefined),
      })
    );
  }, []);

  const trackGalleryAlbumClick = useCallback(
    (year: number, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["gallery_clicked_album"],
        buildEventProps("Gallery", {
          year,
          ...additionalProps,
        })
      );
    },
    []
  );

  // ============ SECTION ============

  const trackSectionView = useCallback(
    (sectionName: string, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["section_viewed"],
        buildEventProps("Page", {
          section_name: sectionName,
          ...additionalProps,
        })
      );
    },
    []
  );

  // ============ EXTERNAL / SOCIAL ============

  const trackExternalSocialClick = useCallback(
    (platform: string, additionalProps?: Partial<AmplitudeEventProperties>) => {
      trackEvent(
        AmplitudeEvents["external_clicked_social_link"],
        buildEventProps("Social", {
          platform,
          ...additionalProps,
        })
      );
    },
    []
  );

  // ============ ERROR HANDLING ============

  const trackError = useCallback(
    (errorType: string, errorMessage: string, context?: string) => {
      trackEvent(
        AmplitudeEvents["error_occurred"],
        buildEventProps("Error", {
          error_type: errorType,
          error_message: errorMessage,
          label: context,
        })
      );
    },
    []
  );

  return {
    // Page views
    trackPageView,
    
    // CTA
    trackCtaHeroClick,
    
    // Navigation
    trackNavigationClick,
    trackMobileMenuToggle,
    
    // Signup/Form
    trackSignupStarted,
    trackSignupSubmitted,
    trackSignupSuccess,
    trackSignupError,
    trackFormFieldError,
    
    // Gallery
    trackGalleryView,
    trackGalleryAlbumClick,
    
    // Section
    trackSectionView,
    
    // Social/External
    trackExternalSocialClick,
    
    // Errors
    trackError,
  };
};
