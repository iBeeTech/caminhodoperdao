import { amplitudeClient } from "../../services/analytics/amplitude/client";
import { amplitudeConfig } from "../../services/analytics/amplitude/config";

const ANON_STORAGE_KEY = "cpd_anon_user_id";

const safeGenerateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const getEnvName = (): string | undefined => {
  return (process.env.REACT_APP_ENVIRONMENT as string) || (process.env.NODE_ENV as string) || undefined;
};

const getAppVersion = (): string | undefined => {
  return (process.env.REACT_APP_APP_VERSION as string) || (process.env.VITE_APP_VERSION as string) || undefined;
};

/**
 * Obter ou criar um userId anonimo (LGPD-safe).
 * Nunca armazena email/nome/telefone. Usa UUID client-side.
 */
export const getOrCreateAnonymousUserId = (): string => {
  if (typeof window === "undefined" || !window.localStorage) {
    return safeGenerateId();
  }

  try {
    const existing = window.localStorage.getItem(ANON_STORAGE_KEY);
    if (existing) return existing;
    const freshId = safeGenerateId();
    window.localStorage.setItem(ANON_STORAGE_KEY, freshId);
    return freshId;
  } catch (error) {
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] Failed to access localStorage for anon id", error);
    }
    return safeGenerateId();
  }
};

/**
 * Inicializa identidade anonima padrao. Mantem LGPD (sem PII).
 */
export const initAnonymousIdentity = (): void => {
  const anonId = getOrCreateAnonymousUserId();
  setUserIdSafe(anonId);
  setUserPropertiesSafe({
    user_type: "anonymous",
    environment: getEnvName(),
    app_version: getAppVersion(),
  });

  if (amplitudeConfig.debug) {
    console.debug("[Amplitude] Anonymous identity set", { anonId });
  }
};

/**
 * Atualiza propriedades quando cadastro for criado.
 * Mantem o mesmo anonId por padrao para preservar continuidade.
 */
export const identifyRegisteredUser = (
  registrationId: string,
  options?: { setUserIdToRegistrationId?: boolean; registrationStatus?: string }
): void => {
  if (!registrationId) return;

  if (options?.setUserIdToRegistrationId) {
    setUserIdSafe(registrationId);
  }

  setUserPropertiesSafe({
    registration_id: registrationId,
    registration_status: options?.registrationStatus ?? "pending",
    user_type: "registered",
  });

  if (amplitudeConfig.debug) {
    console.debug("[Amplitude] Registered identity updated", { registrationId });
  }
};

// Internal helpers to avoid circular deps
const setUserIdSafe = (userId: string): void => {
  if (!userId) return;
  if (!amplitudeConfig.enabled) return;
  try {
    amplitudeClient.setUserId(userId);
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] User ID set (identity)", { userId });
    }
  } catch (error) {
    console.error("[Amplitude] Error setting user ID (identity)", error);
  }
};

const setUserPropertiesSafe = (props: Record<string, string | number | boolean | undefined>): void => {
  if (!props || !amplitudeConfig.enabled) return;
  try {
    amplitudeClient.setUserProperties(props);
    if (amplitudeConfig.debug) {
      console.debug("[Amplitude] User properties set (identity)", props);
    }
  } catch (error) {
    console.error("[Amplitude] Error setting user properties (identity)", error);
  }
};
