/**
 * Barrel export para analytics utilities
 * 
 * Facilita importações dos principais módulos
 */

// Context helpers (sanitização, validação, merge)
export {
  sanitizeProps,
  mergeProps,
  getPageContext,
  isProhibitedKey,
  validateEventProperties,
  prepareEventProperties,
  PROHIBITED_KEYS,
  type PageContext,
} from "./amplitudeContext";

// Event definitions
export {
  AMPLITUDE_EVENTS,
  EVENT_PROPERTIES_SCHEMA,
  type AmplitudeEventName,
  type AmplitudeEventProperties,
} from "./amplitudeEvents";

// High-level tracking functions
export {
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
} from "./tracking";
