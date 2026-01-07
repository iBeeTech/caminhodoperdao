import { useEffect, useRef } from "react";
import { useAnalytics } from "./useAnalytics";

/**
 * Hook para rastrear quando uma seção entra em visibilidade na tela
 * 
 * ⚠️ CLIENT-ONLY: Só executa no cliente (usa window e IntersectionObserver)
 * 
 * Dispara o evento de section_viewed apenas uma vez por página load
 * 
 * Usa a nova API padronizada que injeta automaticamente:
 * - page_name (inferido da rota)
 * - section_id (obrigatório)
 * - section_name (obrigatório)
 * - timestamp
 * 
 * Emite: section_viewed com propriedades completas
 * 
 * @param sectionId - ID da seção a ser rastreada (deve corresponder ao id do DOM)
 * @param sectionName - Nome legível da seção para o evento analytics
 * @param pageName - Nome da página (inferido automaticamente se não fornecido)
 * @param position - Posição da seção ("top", "middle", "bottom") - opcional
 * 
 * @example
 * const MySection: React.FC = () => {
 *   useSectionView("features-section", "features");
 *   return <section id="features-section">...</section>;
 * };
 * 
 * @example Com página customizada
 * useSectionView("about-section", "about", "landing", "middle");
 */
export const useSectionView = (
  sectionId: string,
  sectionName: string,
  pageName?: string,
  position?: string
) => {
  const { sectionViewed } = useAnalytics();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Safety: só executar no cliente
    if (typeof window === "undefined") {
      return;
    }

    // Safety: verificar se IntersectionObserver existe (older browsers)
    if (!("IntersectionObserver" in window)) {
      console.warn("[useSectionView] IntersectionObserver not supported");
      return;
    }

    const element = document.getElementById(sectionId);
    if (!element) {
      console.warn(`[useSectionView] Element with id "${sectionId}" not found`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Se a seção entrou em visibilidade e ainda não foi rastreada
          if (entry.isIntersecting && !hasTrackedRef.current) {
            // Inferir pageName da rota se não fornecido
            const inferredPageName = pageName || inferPageNameFromRoute();
            
            // Emitir evento com todas as propriedades
            sectionViewed(
              inferredPageName,
              sectionId,
              sectionName,
              position
            );
            
            hasTrackedRef.current = true;
            // Desinscrever após rastrear para liberar memória
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.25, // Quando 25% da seção está visível
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [sectionId, sectionName, pageName, position, sectionViewed]);
};

/**
 * Inferir nome da página baseado na rota atual
 * 
 * Mapeamento simples de rotas para nomes de página
 * Extensível conforme novos tipos de página forem adicionados
 */
function inferPageNameFromRoute(): string {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const pathname = window.location.pathname;

  if (pathname === "/" || pathname === "") {
    return "landing";
  }

  if (pathname.startsWith("/gallery")) {
    return "gallery";
  }

  if (pathname.startsWith("/about")) {
    return "about";
  }

  // Fallback: usar primeira parte do pathname
  const parts = pathname.split("/").filter((p) => p);
  return parts[0] || "unknown";
}
