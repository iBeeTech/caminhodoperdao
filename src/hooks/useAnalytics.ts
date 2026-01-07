/**
 * Hook customizado para rastreamento de eventos
 * 
 * Fornece façade com 14 métodos convenientes para eventos específicos
 * Todos SSR-safe (verificam se window existe)
 * 
 * @example
 * const { trackNavigation, trackSignupSubmitted } = useAnalytics();
 * 
 * trackNavigation("Home", "/");
 * trackSignupSubmitted("registration", { email: "user@example.com" });
 */

import { useCallback } from "react";
import {
  trackEvent,
  amplitude_events,
} from "../services/analytics/amplitude";

export const useAnalytics = () => {
  // ============ Landing Page Events ============

  const trackLandingPage = useCallback(() => {
    trackEvent(amplitude_events.LANDING_PAGE_VIEWED);
  }, []);

  const trackHeroAction = useCallback((actionType: "primary" | "secondary") => {
    const eventName =
      actionType === "primary"
        ? amplitude_events.HERO_PRIMARY_CTA_CLICKED
        : amplitude_events.HERO_SECONDARY_CTA_CLICKED;
    trackEvent(eventName);
  }, []);

  // ============ Navigation Events ============

  const trackNavigation = useCallback((linkName: string, href: string) => {
    trackEvent(amplitude_events.NAVIGATION_LINK_CLICKED, {
      link_name: linkName,
      href,
    });
  }, []);

  const trackMobileMenu = useCallback((action: "opened" | "closed") => {
    const eventName =
      action === "opened"
        ? amplitude_events.MOBILE_MENU_OPENED
        : amplitude_events.MOBILE_MENU_CLOSED;
    trackEvent(eventName);
  }, []);

  // ============ Signup/Registration Events ============

  const trackSignupStarted = useCallback((formType: "check" | "registration") => {
    trackEvent(amplitude_events.SIGNUP_FORM_STARTED, {
      form_type: formType,
    });
  }, []);

  const trackSignupSubmitted = useCallback(
    (formType: "check" | "registration", data?: Record<string, any>) => {
      trackEvent(amplitude_events.SIGNUP_REGISTRATION_SUBMITTED, {
        form_type: formType,
        ...data,
      });
    },
    []
  );

  const trackSignupSuccess = useCallback((status: string) => {
    trackEvent(amplitude_events.SIGNUP_REGISTRATION_SUCCESS, {
      status,
    });
  }, []);

  const trackSignupError = useCallback((error: string, fieldName?: string) => {
    trackEvent(amplitude_events.SIGNUP_REGISTRATION_ERROR, {
      error,
      field: fieldName,
    });
  }, []);

  const trackFormFieldError = useCallback(
    (fieldName: string, errorMessage: string) => {
      trackEvent(amplitude_events.SIGNUP_FORM_FIELD_ERROR, {
        field_name: fieldName,
        error_message: errorMessage,
      });
    },
    []
  );

  // ============ Gallery Events ============

  const trackGalleryView = useCallback(() => {
    trackEvent(amplitude_events.GALLERY_PAGE_VIEWED);
  }, []);

  const trackGalleryAlbumClick = useCallback((year: number) => {
    trackEvent(amplitude_events.GALLERY_ALBUM_CLICKED, {
      year,
    });
  }, []);

  // ============ Section Events ============

  const trackSectionView = useCallback((sectionName: string) => {
    trackEvent(amplitude_events.SECTION_VIEWED, {
      section: sectionName,
    });
  }, []);

  // ============ Social Events ============

  const trackSocialLink = useCallback((platform: string) => {
    trackEvent(amplitude_events.SOCIAL_LINK_CLICKED, {
      platform,
    });
  }, []);

  // ============ Error Tracking ============

  const trackError = useCallback(
    (errorName: string, errorMessage: string, context?: string) => {
      trackEvent(amplitude_events.ERROR_OCCURRED, {
        error_name: errorName,
        error_message: errorMessage,
        context,
      });
    },
    []
  );

  return {
    trackLandingPage,
    trackHeroAction,
    trackNavigation,
    trackMobileMenu,
    trackSignupStarted,
    trackSignupSubmitted,
    trackSignupSuccess,
    trackSignupError,
    trackFormFieldError,
    trackGalleryView,
    trackGalleryAlbumClick,
    trackSectionView,
    trackSocialLink,
    trackError,
  };
};
