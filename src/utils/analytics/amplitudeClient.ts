/**
 * Amplitude client wrapper (CRA-safe, LGPD-safe)
 * - Lazy loads @amplitude/analytics-browser only on client
 * - Honors REACT_APP_AMPLITUDE_ENABLED flag
 * - Uses anonymous user id persisted in localStorage (no PII)
 */

import { sanitizeProps } from "./sanitizer";

const AMPLITUDE_EVENT_NAMES = {
  PAGE_VIEWED: "page_viewed",
  SECTION_VIEWED: "section_viewed",
  FORM_SECTION_VIEWED: "form_section_viewed",
  NAVIGATION_LINK_CLICKED: "navigation_link_clicked",
  NAVIGATION_MENU_TOGGLED: "navigation_menu_toggled",
  CTA_CLICKED: "cta_clicked",
  FORM_STARTED: "form_started",
  FORM_SUBMITTED: "form_submitted",
  FORM_SUCCESS: "form_success",
  FORM_ERROR: "form_error",
  GALLERY_VIEWED: "gallery_viewed",
  GALLERY_ALBUM_CLICKED: "gallery_album_clicked",
  EXTERNAL_LINK_CLICKED: "external_link_clicked",
  ERROR_OCCURRED: "error_occurred",
  SIGNUP_RESERVED: "signup_reserved",
  PAYMENT_CONFIRMED: "payment_confirmed",
} as const;

const AMPLITUDE_ENABLED = typeof window !== "undefined" && (process.env.REACT_APP_AMPLITUDE_ENABLED || "false").toLowerCase() === "true";
const AMPLITUDE_API_KEY = typeof window !== "undefined" ? (process.env.REACT_APP_AMPLITUDE_KEY || "") : "";
const AMPLITUDE_DEBUG = typeof window !== "undefined" && (process.env.REACT_APP_AMPLITUDE_DEBUG || "false").toLowerCase() === "true";

if (typeof window !== "undefined") {
  console.log("[Amplitude] Config:", {
    enabled: AMPLITUDE_ENABLED,
    apiKey: AMPLITUDE_API_KEY ? `${AMPLITUDE_API_KEY.substring(0, 8)}...` : "NOT_SET",
    debug: AMPLITUDE_DEBUG,
  });
}

let amplitudeSDK: typeof import("@amplitude/analytics-browser") | null = null;
let initPromise: Promise<void> | null = null;
// SDK functions are accessed directly after dynamic import; no static typings to avoid extra deps

export const getOrCreateAnonymousUserId = (): string => {
  if (typeof window === "undefined" || !window.localStorage) return crypto.randomUUID();

  const KEY = "anonymous_user_id";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch (error) {
    console.warn("[Amplitude] Failed to access localStorage for anon id", error);
    return crypto.randomUUID();
  }
};

const ensureSDK = async () => {
  if (amplitudeSDK) return amplitudeSDK;
  amplitudeSDK = await import("@amplitude/analytics-browser");
  return amplitudeSDK;
};

const ensureInit = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!AMPLITUDE_ENABLED || !AMPLITUDE_API_KEY) {
      if (AMPLITUDE_DEBUG) {
        console.log("[Amplitude] Skipping init - enabled:", AMPLITUDE_ENABLED, "apiKey:", !!AMPLITUDE_API_KEY);
      }
      return;
    }
    const amplitude = await ensureSDK();
    amplitude.init(AMPLITUDE_API_KEY, undefined, {
      defaultTracking: {
        pageViews: false,
        sessions: true,
        formInteractions: false,
      },
      autocapture: false,
    });
    amplitude.setUserId(getOrCreateAnonymousUserId());
    if (AMPLITUDE_DEBUG) {
      console.log("[Amplitude] Initialized successfully");
    }
  })();

  return initPromise;
};

export const trackWithClient = async (
  eventName: typeof AMPLITUDE_EVENT_NAMES[keyof typeof AMPLITUDE_EVENT_NAMES],
  props?: Record<string, any>
): Promise<void> => {
  if (typeof window === "undefined") return;
  if (!AMPLITUDE_ENABLED || !AMPLITUDE_API_KEY) {
    if (AMPLITUDE_DEBUG) {
      console.log("[Amplitude] Track skipped - enabled:", AMPLITUDE_ENABLED, "apiKey:", !!AMPLITUDE_API_KEY);
    }
    return;
  }

  await ensureInit();
  if (!amplitudeSDK) {
    if (AMPLITUDE_DEBUG) {
      console.log("[Amplitude] SDK not loaded");
    }
    return;
  }

  const safeProps = sanitizeProps({ ...props, timestamp_ms: Date.now() });
  try {
    console.log("[Amplitude] Sending event:", eventName, "props:", safeProps);
    amplitudeSDK.track(eventName, safeProps);
    if (AMPLITUDE_DEBUG) {
      console.log("[Amplitude] Event tracked:", eventName, safeProps);
    }
  } catch (error) {
    console.error("[Amplitude] track error", error);
  }
};

export const amplitudeEventNames = AMPLITUDE_EVENT_NAMES;
