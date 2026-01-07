import { AvailabilityResponse } from "../../../services/landing/landing.types";

export type LandingPhase = "check" | "form" | "status";

export type LandingTone = "success" | "warn" | "error" | null;

export interface LandingContent {
  hero: HeroSection;
  features: FeatureSection[];
  testimonials: Testimonial[];
  callToAction: CallToActionSection;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  backgroundImage?: string;
}

export interface FeatureSection {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  avatar?: string;
  rating: number;
}

export interface CallToActionSection {
  title: string;
  description: string;
  buttonText: string;
  buttonAction: string;
}

export interface AvailabilityState extends AvailabilityResponse {
  loading: boolean;
  error?: string;
}

export const defaultLandingContent: LandingContent = {
  hero: {
    title: "Caminho do Perdão",
    subtitle: "Encontre paz interior e renovação espiritual",
    description:
      "Uma jornada de transformação pessoal através do perdão, autoconhecimento e crescimento espiritual. Descubra o poder libertador de perdoar e seja livre.",
    primaryButtonText: "Fazer Inscrição",
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
    buttonText: "Fazer inscrição",
    buttonAction: "signup",
  },
};
