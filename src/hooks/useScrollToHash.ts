import { useEffect } from "react";

// Quanto tempo insistimos esperando a seção renderizar (conteúdo que depende
// de fetch, ex.: lista de espera só aparece depois do /api/availability).
const RETRY_INTERVAL_MS = 200;
const MAX_RETRIES = 30; // ~6s

// Se a âncora pedida não existir (ex.: #listaDeEspera com evento ainda aberto),
// rola para a seção substituta em vez de não fazer nada.
const HASH_FALLBACKS: Record<string, string> = {
  listaDeEspera: "registration-form",
};

/**
 * Rola até a seção indicada no hash da URL (ex.: /#listaDeEspera) assim que o
 * elemento existir no DOM. Permite mandar links diretos para seções da landing.
 */
export function useScrollToHash(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
    if (!hash) return;

    const fallback = HASH_FALLBACKS[hash];
    let attempts = 0;

    const tryScroll = () => {
      attempts += 1;
      // Só recorre ao fallback depois de dar tempo do alvo principal renderizar.
      const target =
        document.getElementById(hash) ??
        (fallback && attempts > MAX_RETRIES / 2 ? document.getElementById(fallback) : null);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(intervalId);
        return;
      }
      if (attempts >= MAX_RETRIES) {
        window.clearInterval(intervalId);
      }
    };

    const intervalId = window.setInterval(tryScroll, RETRY_INTERVAL_MS);
    tryScroll();

    return () => window.clearInterval(intervalId);
  }, []);
}
