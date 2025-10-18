import { LandingContent } from "../models/LandingModels";

export class LandingController {
  // Simulação de dados - em um projeto real, isso viria de uma API
  private static landingData: LandingContent = {
    hero: {
      title: "Caminho do Perdão",
      subtitle: "Encontre paz interior e renovação espiritual",
      description:
        "Uma jornada de transformação pessoal através do perdão, autoconhecimento e crescimento espiritual. Descubra o poder libertador de perdoar e seja livre.",
      primaryButtonText: "Iniciar Jornada",
      secondaryButtonText: "Saiba Mais",
    },
    features: [
      {
        id: "1",
        icon: "🕊️",
        title: "Paz Interior",
        description:
          "Encontre tranquilidade e equilíbrio emocional através de práticas de perdão e autocompaixão.",
        highlighted: true,
      },
      {
        id: "2",
        icon: "🌱",
        title: "Crescimento Pessoal",
        description:
          "Desenvolva-se como pessoa através de reflexões profundas e exercícios de autoconhecimento.",
        highlighted: false,
      },
      {
        id: "3",
        icon: "💝",
        title: "Relacionamentos Saudáveis",
        description:
          "Aprenda a construir e manter relacionamentos mais harmoniosos e verdadeiros.",
        highlighted: false,
      },
      {
        id: "4",
        icon: "✨",
        title: "Transformação Espiritual",
        description:
          "Conecte-se com sua essência mais profunda e encontre propósito em sua jornada de vida.",
        highlighted: true,
      },
    ],
    testimonials: [
      {
        id: "1",
        name: "Maria Silva",
        role: "Participante do Programa",
        comment:
          "O Caminho do Perdão transformou completamente minha vida. Consegui me libertar de mágoas antigas e encontrar paz interior.",
        rating: 5,
      },
      {
        id: "2",
        name: "João Santos",
        role: "Facilitador Voluntário",
        comment:
          "Ser parte desta comunidade me trouxe muito crescimento. Ajudar outros a encontrarem o perdão também me cura.",
        rating: 5,
      },
      {
        id: "3",
        name: "Ana Costa",
        role: "Coordenadora Local",
        comment:
          "Um programa que realmente funciona. Vi pessoas se transformarem de forma incrível através destes ensinamentos.",
        rating: 5,
      },
    ],
    callToAction: {
      title: "Pronto para Começar sua Jornada?",
      description:
        "Dê o primeiro passo em direção à sua transformação pessoal e espiritual. Junte-se a milhares de pessoas que já encontraram o caminho do perdão.",
      buttonText: "Começar Agora",
      buttonAction: "signup",
    },
  };

  public static getLandingContent(): LandingContent {
    return this.landingData;
  }

  public static updateLandingContent(
    content: Partial<LandingContent>
  ): LandingContent {
    this.landingData = { ...this.landingData, ...content };
    return this.landingData;
  }

  public static handlePrimaryAction(): void {
    // Lógica para ação principal (iniciar jornada)
    console.log("Iniciando jornada do usuário...");
    // Aqui seria implementada a navegação ou modal de cadastro
  }

  public static handleSecondaryAction(): void {
    // Lógica para ação secundária (saiba mais)
    console.log("Mostrando mais informações...");
    // Aqui seria implementada a navegação para página de detalhes
  }

  public static handleCallToAction(): void {
    // Lógica para call-to-action
    console.log("Processando call-to-action...");
    // Aqui seria implementada a lógica de conversão
  }

  public static trackUserInteraction(action: string, element: string): void {
    // Lógica para tracking de analytics
    console.log(`Ação rastreada: ${action} no elemento: ${element}`);
    // Aqui seria implementada a integração com Google Analytics, etc.
  }
}
