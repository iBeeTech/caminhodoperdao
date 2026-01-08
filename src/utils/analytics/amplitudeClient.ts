/**
 * Amplitude client wrapper (CRA-safe, LGPD-safe)
 * - Lazy loads @amplitude/analytics-browser only on client
 * - Honors REACT_APP_AMPLITUDE_ENABLED flag
 * - Uses anonymous user id persisted in localStorage (no PII)
 */

import { sanitizeProps } from "./sanitizer";

const AMPLITUDE_EVENT_NAMES = {
  SCREEN_VIEW: "screen_view",
  NONINTERACTION: "noninteraction",
  INTERACTION: "interaction",
} as const;

const AMPLITUDE_ENABLED = typeof window !== "undefined" && (process.env.REACT_APP_AMPLITUDE_ENABLED || "false").toLowerCase() === "true";
const AMPLITUDE_API_KEY = typeof window !== "undefined" ? (process.env.REACT_APP_AMPLITUDE_KEY || "") : "";

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
    if (!AMPLITUDE_ENABLED || !AMPLITUDE_API_KEY) return;
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
  })();

  return initPromise;
};

export const trackWithClient = async (
  eventName: typeof AMPLITUDE_EVENT_NAMES[keyof typeof AMPLITUDE_EVENT_NAMES],
  props?: Record<string, any>
): Promise<void> => {
  if (typeof window === "undefined") return;
  if (!AMPLITUDE_ENABLED || !AMPLITUDE_API_KEY) return;

  await ensureInit();
  if (!amplitudeSDK) return;

  const safeProps = sanitizeProps({ ...props, timestamp_ms: Date.now() });
  try {
    amplitudeSDK.track(eventName, safeProps);
  } catch (error) {
    console.error("[Amplitude] track error", error);
  }
};

export const amplitudeEventNames = AMPLITUDE_EVENT_NAMES;
