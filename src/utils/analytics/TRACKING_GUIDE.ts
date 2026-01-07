/**
 * GUIA DE USO: Amplitude Analytics Padronizado
 * 
 * Este arquivo documenta como usar o novo sistema de eventos.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * MUDANÇAS PRINCIPAIS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ❌ ANTES (genérico, sem contexto):
 *   trackEvent("page_viewed")
 *   trackEvent("section_viewed", { section_name: "features" })
 *   trackEvent("cta_clicked_hero_primary")
 * 
 * ✅ DEPOIS (padronizado, com contexto automático):
 *   trackPageViewed("landing")
 *   trackSectionViewed("landing", "features-section", "features", "top")
 *   trackCtaClicked("landing", "hero_primary", "Get Started", "registration")
 * 
 * BENEFÍCIOS:
 * - page_name, route, timestamp injetados automaticamente
 * - PII removido automaticamente (LGPD-compliant)
 * - Propriedades obrigatórias validadas em dev
 * - Nomes de eventos genéricos (bons para dashboards)
 * - Contexto em properties (bom para segmentação)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENTOS PADRONIZADOS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. PAGE_VIEWED
 *    Nome do evento: "page_viewed"
 *    Propriedades obrigatórias: page_name
 *    Propriedades opcionais: route, referrer
 *    
 *    Exemplo:
 *    trackPageViewed("landing");
 *    // Emite: {
 *    //   event_name: "page_viewed",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     route: "/",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 2. SECTION_VIEWED
 *    Nome do evento: "section_viewed"
 *    Propriedades obrigatórias: page_name, section_id, section_name
 *    Propriedades opcionais: position ("top", "middle", "bottom")
 *    
 *    Exemplo:
 *    trackSectionViewed("landing", "features-section", "features", "middle");
 *    // Emite: {
 *    //   event_name: "section_viewed",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     section_id: "features-section",
 *    //     section_name: "features",
 *    //     position: "middle",
 *    //     route: "/",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 3. NAVIGATION_LINK_CLICKED
 *    Nome do evento: "navigation_link_clicked"
 *    Propriedades obrigatórias: page_name, link_text, href
 *    Propriedades opcionais: location ("header", "footer", "mobile_menu")
 *    
 *    Exemplo:
 *    trackNavigationLinkClicked("landing", "About", "/about", "header");
 *    // Emite: {
 *    //   event_name: "navigation_link_clicked",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     link_text: "About",
 *    //     href: "/about",
 *    //     location: "header",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 4. NAVIGATION_MENU_TOGGLED
 *    Nome do evento: "navigation_menu_toggled"
 *    Propriedades obrigatórias: action
 *    Propriedades opcionais: location, page_name
 *    
 *    Exemplo:
 *    trackNavigationMenuToggled("open", "mobile_menu", "landing");
 *    // Emite: {
 *    //   event_name: "navigation_menu_toggled",
 *    //   properties: {
 *    //     action: "open",
 *    //     location: "mobile_menu",
 *    //     page_name: "landing",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 5. CTA_CLICKED
 *    Nome do evento: "cta_clicked"
 *    Propriedades obrigatórias: page_name, cta_id
 *    Propriedades opcionais: cta_text, destination
 *    
 *    Exemplo:
 *    trackCtaClicked("landing", "hero_primary", "Get Started", "registration");
 *    // Emite: {
 *    //   event_name: "cta_clicked",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     cta_id: "hero_primary",
 *    //     cta_text: "Get Started",
 *    //     destination: "registration",
 *    //     route: "/",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 6. FORM_STARTED
 *    Nome do evento: "form_started"
 *    Propriedades obrigatórias: page_name, form_id
 *    Propriedades opcionais: form_step
 *    
 *    Exemplo:
 *    trackFormStarted("landing", "signup_check");
 *    // Emite: {
 *    //   event_name: "form_started",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     form_id: "signup_check",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 7. FORM_SUBMITTED
 *    Nome do evento: "form_submitted"
 *    Propriedades obrigatórias: page_name, form_id
 *    Propriedades opcionais: status, form_step
 *    
 *    Exemplo:
 *    trackFormSubmitted("landing", "signup_check", "pending");
 *    // ⚠️ LGPD: Nunca inclua email, cpf, phone, endereço, etc
 *    // Emite: {
 *    //   event_name: "form_submitted",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     form_id: "signup_check",
 *    //     status: "pending",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 8. FORM_SUCCESS
 *    Nome do evento: "form_success"
 *    Propriedades obrigatórias: page_name, form_id
 *    Propriedades opcionais: status
 *    
 *    Exemplo:
 *    trackFormSuccess("landing", "signup_registration", "check_confirmed");
 *    // Emite: {
 *    //   event_name: "form_success",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     form_id: "signup_registration",
 *    //     status: "check_confirmed",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 9. FORM_ERROR
 *    Nome do evento: "form_error"
 *    Propriedades obrigatórias: page_name, form_id, error_type
 *    Propriedades opcionais: field_name
 *    
 *    Exemplo:
 *    trackFormError("landing", "signup_check", "validation_error", "email");
 *    // ⚠️ LGPD: error_message nunca deve conter dados sensíveis
 *    // Emite: {
 *    //   event_name: "form_error",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     form_id: "signup_check",
 *    //     error_type: "validation_error",
 *    //     field_name: "email",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * 10. GALLERY_VIEWED
 *     Nome do evento: "gallery_viewed"
 *     Propriedades obrigatórias: page_name
 *     Propriedades opcionais: route
 *     
 *     Exemplo:
 *     trackGalleryViewed();
 *     // Emite: {
 *     //   event_name: "gallery_viewed",
 *     //   properties: {
 *     //     page_name: "gallery",
 *     //     route: "/gallery",
 *     //     timestamp: 1234567890
 *     //   }
 *     // }
 * 
 * 11. GALLERY_ALBUM_CLICKED
 *     Nome do evento: "gallery_album_clicked"
 *     Propriedades obrigatórias: (nenhuma obrigatória)
 *     Propriedades opcionais: album_year, album_name
 *     
 *     Exemplo:
 *     trackGalleryAlbumClicked(2024, "Summer Retreat");
 *     // Emite: {
 *     //   event_name: "gallery_album_clicked",
 *     //   properties: {
 *     //     page_name: "gallery",
 *     //     album_year: 2024,
 *     //     album_name: "Summer Retreat",
 *     //     timestamp: 1234567890
 *     //   }
 *     // }
 * 
 * 12. EXTERNAL_LINK_CLICKED
 *     Nome do evento: "external_link_clicked"
 *     Propriedades obrigatórias: (nenhuma obrigatória)
 *     Propriedades opcionais: platform, url, link_text, page_name
 *     
 *     Exemplo:
 *     trackExternalLinkClicked("instagram", undefined, "Follow us");
 *     // Emite: {
 *     //   event_name: "external_link_clicked",
 *     //   properties: {
 *     //     platform: "instagram",
 *     //     link_text: "Follow us",
 *     //     timestamp: 1234567890
 *     //   }
 *     // }
 * 
 * 13. ERROR_OCCURRED
 *     Nome do evento: "error_occurred"
 *     Propriedades obrigatórias: error_type
 *     Propriedades opcionais: error_message, context, page_name
 *     
 *     Exemplo:
 *     trackErrorOccurred("form_validation", "Email format invalid", "landing_signup");
 *     // ⚠️ LGPD: error_message nunca deve conter dados sensíveis
 *     // Emite: {
 *     //   event_name: "error_occurred",
 *     //   properties: {
 *     //     error_type: "form_validation",
 *     //     error_message: "Email format invalid",
 *     //     context: "landing_signup",
 *     //     timestamp: 1234567890
 *     //   }
 *     // }
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * COMO USAR EM COMPONENTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. Importar o hook
 * ──────────────────
 *    import { useAnalytics } from "@/hooks/useAnalytics";
 * 
 * 2. Usar em um componente
 * ────────────────────────
 *    const MyComponent: React.FC = () => {
 *      const { pageViewed, ctaClicked } = useAnalytics();
 *      
 *      useEffect(() => {
 *        // Rastrear quando página carrega
 *        pageViewed("landing");
 *      }, []);
 *      
 *      return (
 *        <button onClick={() => ctaClicked("landing", "hero_primary")}>
 *          Get Started
 *        </button>
 *      );
 *    };
 * 
 * 3. Usar em seções com visibilidade
 * ──────────────────────────────────
 *    import { useSectionView } from "@/hooks/useSectionView";
 *    
 *    const FeaturesSection: React.FC = () => {
 *      useSectionView("features-section", "features", "landing", "middle");
 *      return <section id="features-section">...</section>;
 *    };
 *    
 *    // Emite automatically quando a seção fica visível:
 *    // {
 *    //   event_name: "section_viewed",
 *    //   properties: {
 *    //     page_name: "landing",
 *    //     section_id: "features-section",
 *    //     section_name: "features",
 *    //     position: "middle",
 *    //     timestamp: 1234567890
 *    //   }
 *    // }
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * LGPD - O QUE NÃO ENVIAR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ❌ PROIBIDO (removido automaticamente):
 *    - email
 *    - cpf / cnpj
 *    - phone / cellphone / mobile
 *    - address / cep / city / state / complement / number
 *    - card_number / cvv / bankAccount
 *    - qrCodeText / qrCode
 *    - name / fullName
 *    - password / token / apiKey / secret
 *    - ipAddress / deviceId / idfa / aaid
 * 
 * Se você tentar enviar uma propriedade com PII, ela será:
 * 1. Removida automaticamente
 * 2. Warning será exibido no console (dev mode)
 * 3. Evento será enviado sem a propriedade sensível
 * 
 * EXEMPLO:
 * --------
 * const props = {
 *   form_id: "signup",
 *   email: "user@example.com",  // ❌ Será removido
 *   phone: "11999999999",        // ❌ Será removido
 * };
 * 
 * const sanitized = sanitizeProps(props);
 * // Resultado: { form_id: "signup" }
 * // [Dev] Warning: "PII detected in event properties: email, phone"
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * DASHBOARDS AMPLITUDE - COMO FILTRAR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEMA RESOLVIDO:
 * Antes:  "cta_clicked_hero_primary", "cta_clicked_hero_secondary", ...
 *         (múltiplos eventos para mesma ação, difícil filtrar)
 * 
 * DEPOIS: Um único evento "cta_clicked" com properties
 *         Filtrar: event_properties[cta_id] = "hero_primary"
 *         (único evento, fácil filtrar, fácil escalar)
 * 
 * EXEMPLOS DE FILTROS AMPLITUDE:
 * ───────────────────────────────
 * 
 * 1. "Quantos cliques em CTA?"
 *    Filter: Event Name = "cta_clicked"
 *    Resultado: Todos os CTAs
 * 
 * 2. "Quantos cliques especificamente no hero primary?"
 *    Filter: Event Name = "cta_clicked"
 *    AND     event_properties[cta_id] = "hero_primary"
 *    Resultado: Apenas hero primary
 * 
 * 3. "Quantos usuários completaram o signup?"
 *    Filter: Event Name = "form_success"
 *    AND     event_properties[form_id] = "signup_registration"
 *    Resultado: Signups completos
 * 
 * 4. "Qual foi a taxa de erro no formulário de check?"
 *    Filter: Event Name = "form_error"
 *    AND     event_properties[form_id] = "signup_check"
 *    Resultado: Erros do check
 * 
 * 5. "Quais seções são mais vistas na landing?"
 *    Filter: Event Name = "section_viewed"
 *    AND     event_properties[page_name] = "landing"
 *    Group By: event_properties[section_name]
 *    Resultado: Seções ordenadas por views
 * 
 * 6. "Qual a taxa de erro por campo?"
 *    Filter: Event Name = "form_error"
 *    AND     event_properties[form_id] = "signup_check"
 *    Group By: event_properties[field_name]
 *    Resultado: Erros agrupados por campo
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * DÚVIDAS?
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ver arquivo: src/utils/analytics/amplitudeContext.ts
 * Ver arquivo: src/utils/analytics/tracking.ts
 * Ver arquivo: src/utils/analytics/amplitudeEvents.ts
 */

export {};
