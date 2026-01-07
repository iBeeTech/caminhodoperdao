/**
 * Configuração centralizada para Amplitude
 */

import type { AmplitudeConfig } from "./types";

/**
 * Ler config do ambiente (Vite ou Node)
 * Seguro para SSR: retorna valores default se window não existir
 */
function getEnvironmentConfig(): AmplitudeConfig {
  // Para SSR: se typeof window === 'undefined', retornar config safe
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      enabled: false,
      debug: false,
      enableSessionReplay: false,
    };
  }

  // Client-side: ler de variáveis de ambiente
  // Suporta tanto Create React App (REACT_APP_*) quanto Vite (VITE_*)
  // Fallback para process.env que funciona em ambos
  const apiKey = 
    (process.env.REACT_APP_AMPLITUDE_KEY as string) ||
    (process.env.VITE_AMPLITUDE_API_KEY as string) ||
    "";
  
  const enabled = 
    (process.env.REACT_APP_AMPLITUDE_ENABLED as string)?.toLowerCase() === "true" ||
    (process.env.VITE_ENABLE_AMPLITUDE as string)?.toLowerCase() === "true" ||
    true;
  
  const debug = 
    (process.env.REACT_APP_AMPLITUDE_DEBUG as string)?.toLowerCase() === "true" ||
    (process.env.VITE_AMPLITUDE_DEBUG as string)?.toLowerCase() === "true" ||
    false;
  
  const enableSessionReplay = 
    (process.env.REACT_APP_AMPLITUDE_SESSION_REPLAY as string)?.toLowerCase() === "true" ||
    (process.env.VITE_ENABLE_AMPLITUDE_SESSION_REPLAY as string)?.toLowerCase() === "true" ||
    false;

  return {
    apiKey,
    enabled: enabled && !!apiKey, // Desabilitar se não tiver API key
    debug,
    enableSessionReplay,
  };
}

export const amplitudeConfig: AmplitudeConfig = getEnvironmentConfig();

/**
 * Config padrão de inicialização
 * Autocapture desligado por padrão para evitar duplicidade com rastreamento manual
 */
export const amplitudeInitConfig = {
  defaultTracking: {
    sessions: true,
    pageViews: false, // ⚠️ DESLIGADO: rastrearemos manualmente
    formInteractions: false, // ⚠️ DESLIGADO: rastrearemos manualmente
  },
  autocapture: false, // ⚠️ DESLIGADO por padrão
  ...((typeof window !== "undefined" && amplitudeConfig.enableSessionReplay) && {
    sessionReplayConfig: {
      sampleRate: 0.1, // 10% dos usuários (otimizar Core Web Vitals)
    },
  }),
};

if (amplitudeConfig.debug) {
  console.debug("[Amplitude] Config loaded:", amplitudeConfig);
}
