import { useEffect, useRef } from "react";
import { useAnalytics } from "./useAnalytics";

/**
 * Hook para rastrear quando uma seção entra em visibilidade na tela
 * 
 * ⚠️ CLIENT-ONLY: Só executa no cliente (usa window e IntersectionObserver)
 * 
 * Dispara o evento de section_viewed apenas uma vez por página load
 * 
 * @param sectionId - ID da seção a ser rastreada (deve corresponder ao id do DOM)
 * @param sectionName - Nome legível da seção para o evento analytics
 * 
 * @example
 * const MySection: React.FC = () => {
 *   useSectionView("features-section", "features");
 *   return <section id="features-section">...</section>;
 * };
 */
export const useSectionView = (sectionId: string, sectionName: string) => {
  const { trackSectionView } = useAnalytics();
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
            trackSectionView(sectionName, { label: sectionId });
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
  }, [sectionId, sectionName, trackSectionView]);
};
