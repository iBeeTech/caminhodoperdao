export const CONSENT_STORAGE_KEY = "cpd_consent_v1";
export const CONSENT_CHANGE_EVENT = "cpd:consent-changed";

type ConsentState = {
  analytics: boolean;
  timestamp: string;
  version: number;
};

const CONSENT_VERSION = 1;

export const getConsentState = (): ConsentState | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed?.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const hasStoredConsent = (): boolean => {
  return getConsentState() !== null;
};

export const canTrackAnalytics = (): boolean => {
  return getConsentState()?.analytics === true;
};

export const saveConsent = (analytics: boolean): void => {
  if (typeof window === "undefined" || !window.localStorage) return;

  const state: ConsentState = {
    analytics,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
};
