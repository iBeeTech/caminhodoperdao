/**
 * Tipos e interfaces para Amplitude Analytics
 */

export interface AmplitudeConfig {
  apiKey: string;
  enabled: boolean;
  debug: boolean;
  enableSessionReplay: boolean;
}

export interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

export interface UserProperties {
  [key: string]: string | number | boolean | undefined;
}

export interface AmplitudeClient {
  isInitialized: boolean;
  track(eventName: string, eventProperties?: EventProperties): void;
  setUserId(userId: string): void;
  setUserProperties(userProperties: UserProperties): void;
  reset(): void;
}

/**
 * Eventos pré-definidos da aplicação
 */
export const amplitude_events = {
  // Landing Page
  LANDING_PAGE_VIEWED: "landing_page_viewed",
  HERO_PRIMARY_CTA_CLICKED: "hero_primary_cta_clicked",
  HERO_SECONDARY_CTA_CLICKED: "hero_secondary_cta_clicked",

  // Signup/Registration
  SIGNUP_FORM_STARTED: "signup_form_started",
  SIGNUP_CHECK_STATUS_CLICKED: "signup_check_status_clicked",
  SIGNUP_REGISTRATION_SUBMITTED: "signup_registration_submitted",
  SIGNUP_REGISTRATION_SUCCESS: "signup_registration_success",
  SIGNUP_REGISTRATION_ERROR: "signup_registration_error",
  SIGNUP_FORM_FIELD_ERROR: "signup_form_field_error",

  // Navigation
  NAVIGATION_LINK_CLICKED: "navigation_link_clicked",
  MOBILE_MENU_OPENED: "mobile_menu_opened",
  MOBILE_MENU_CLOSED: "mobile_menu_closed",

  // Gallery
  GALLERY_PAGE_VIEWED: "gallery_page_viewed",
  GALLERY_ALBUM_CLICKED: "gallery_album_clicked",

  // Social/External Links
  SOCIAL_LINK_CLICKED: "social_link_clicked",
  EXTERNAL_LINK_CLICKED: "external_link_clicked",

  // Section views
  SECTION_VIEWED: "section_viewed",

  // Errors
  ERROR_OCCURRED: "error_occurred",
} as const;
