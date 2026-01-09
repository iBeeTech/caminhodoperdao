import { trackInteraction, trackNonInteraction, trackScreenView } from "../utils/analytics/trackers";
import type { AmplitudeEventProperties } from "../utils/analytics/amplitudeEvents";
import { useCallback } from "react";

const screenNameFromWindow = (fallback?: string) =>
  typeof window !== "undefined" ? window.location.pathname : fallback;

export const useAnalytics = () => {
  const screenView = useCallback((
    pageName: string,
    screenName?: string
  ) => trackScreenView({ pageName, screenName: screenName || screenNameFromWindow(pageName), category: pageName }), []);

  const nonInteraction = useCallback((
    pageName: string,
    action: string,
    label?: string,
    extra?: Record<string, any>
  ) =>
    trackNonInteraction({
      pageName,
      screenName: screenNameFromWindow(),
      category: pageName,
      action,
      label,
      sectionId: extra?.section_id,
      sectionName: extra?.section_name,
      extra,
    }), []);

  const interaction = useCallback((
    pageName: string,
    action: string,
    label: string,
    elementText?: string,
    href?: string,
    extra?: Record<string, any>
  ) =>
    trackInteraction({
      pageName,
      screenName: screenNameFromWindow(),
      category: pageName,
      action,
      label,
      elementText,
      href,
      extra,
    }), []);

  // ------- Specific helpers (compat layer) ---------
  const pageViewed = (pageName: string, route?: string) => screenView(pageName, route);

  const sectionViewed = useCallback((
    pageName: string,
    sectionId: string,
    sectionName: string,
    position?: string
  ) =>
    nonInteraction(pageName, "section_view", sectionId, {
      section_id: sectionId,
      section_name: sectionName,
      position,
    }), [nonInteraction]);

  const formSectionViewed = useCallback((
    pageName: string,
    sectionId: string,
    sectionName: string,
    position?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) =>
    nonInteraction(pageName, "section_view", sectionId, {
      section_id: sectionId,
      section_name: sectionName,
      position,
      ...additionalProps,
    }), [nonInteraction]);

  const ctaClicked = (
    pageName: string,
    ctaId: string,
    ctaText?: string,
    destination?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) =>
    interaction(pageName, "click_button", ctaId, ctaText, destination, {
      ...additionalProps,
      destination,
      cta_id: ctaId,
    });

  const navigationLinkClicked = (
    pageName: string,
    linkText: string,
    href: string,
    location?: string
  ) =>
    interaction(pageName, "click_link", linkText, linkText, href, {
      location,
      href,
    });

  const navigationMenuToggled = (
    action: "open" | "close" | "toggle",
    location?: string,
    pageName = "app"
  ) => interaction(pageName, "navigation_menu", action, undefined, undefined, { location, action });

  const formStarted = (
    pageName: string,
    formId: string,
    formStep?: number | string
  ) => interaction(pageName, "form_start", formId, undefined, undefined, { form_id: formId, form_step: formStep });

  const formSubmitted = (
    pageName: string,
    formId: string,
    status?: string,
    formStep?: number | string
  ) => interaction(pageName, "submit_form", formId, undefined, undefined, { form_id: formId, status, form_step: formStep });

  const formSuccess = (
    pageName: string,
    formId: string,
    status?: string
  ) => interaction(pageName, "form_success", formId, undefined, undefined, { form_id: formId, status });

  const formError = (
    pageName: string,
    formId: string,
    errorType: string,
    fieldName?: string
  ) => interaction(pageName, "form_error", formId, undefined, undefined, { form_id: formId, error_type: errorType, field_name: fieldName });

  const galleryViewed = (route?: string) => screenView("gallery", route || "/gallery");

  const galleryAlbumClicked = (
    albumYear: number,
    albumName?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) =>
    interaction("gallery", "gallery_album_click", albumYear.toString(), albumName, undefined, {
      album_year: albumYear,
      album_name: albumName,
      ...additionalProps,
    });

  const externalLinkClicked = (
    platform: string,
    url?: string,
    linkText?: string,
    pageName = "external"
  ) => interaction(pageName, "external_link", platform, linkText, url, { platform, url, link_text: linkText });

  const errorOccurred = (
    errorType: string,
    errorMessage?: string,
    context?: string,
    pageName = "app"
  ) => nonInteraction(pageName, "error", errorType, { error_type: errorType, error_message: errorMessage, context });

  const enrollmentReserved = (
    pageName = "landing",
    paymentProvider?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) =>
    interaction(pageName, "enrollment_reserved", "registration_created", undefined, undefined, {
      payment_provider: paymentProvider,
      ...additionalProps,
    });

  const paymentConfirmed = (
    pageName = "landing",
    paymentProvider?: string,
    paymentMethod?: string,
    additionalProps?: Partial<AmplitudeEventProperties>
  ) =>
    interaction(pageName, "payment_confirmed", "pix_paid", undefined, undefined, {
      payment_provider: paymentProvider,
      payment_method: paymentMethod,
      ...additionalProps,
    });

  return {
    screenView,
    nonInteraction,
    interaction,

    // Legacy aliases
    pageViewed,
    trackPageViewed: pageViewed,
    sectionViewed,
    trackSectionViewed: sectionViewed,
    formSectionViewed,
    trackFormSectionViewed: formSectionViewed,
    ctaClicked,
    trackCtaClicked: ctaClicked,
    navigationLinkClicked,
    trackNavigationLinkClicked: navigationLinkClicked,
    navigationMenuToggled,
    trackNavigationMenuToggled: navigationMenuToggled,
    formStarted,
    trackFormStarted: formStarted,
    formSubmitted,
    trackFormSubmitted: formSubmitted,
    formSuccess,
    trackFormSuccess: formSuccess,
    formError,
    trackFormError: formError,
    galleryViewed,
    trackGalleryViewed: galleryViewed,
    galleryAlbumClicked,
    trackGalleryAlbumClicked: galleryAlbumClicked,
    externalLinkClicked,
    trackExternalLinkClicked: externalLinkClicked,
    errorOccurred,
    trackErrorOccurred: errorOccurred,
    enrollmentReserved,
    paymentConfirmed,
  };
};
