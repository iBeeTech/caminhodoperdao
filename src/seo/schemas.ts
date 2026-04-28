export type JsonLd = Record<string, unknown>;

export const SEO_BASE_URL = "https://caminhodoperdao.com.br";
const DEFAULT_IMAGE = `${SEO_BASE_URL}/og-image.png`;

export const buildOrganizationSchema = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Caminho do Perdao",
  url: SEO_BASE_URL,
  logo: `${SEO_BASE_URL}/logo.png`,
  description:
    "Jornada de peregrinacao e transformacao espiritual por meio do perdao, autoconhecimento e fe.",
  sameAs: [
    "https://www.facebook.com/caminhodoperdao",
    "https://www.instagram.com/caminhodoperdao",
  ],
});

export const buildEventSchema = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Caminho do Perdao",
  description:
    "Peregrinacao espiritual para quem busca reconciliacao, cura interior e renovacao da fe.",
  startDate: "2026-08-02T04:30:00-03:00",
  endDate: "2026-08-02T14:00:00-03:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: "Sao Paulo, SP",
    address: {
      "@type": "PostalAddress",
      addressCountry: "BR",
      addressLocality: "Sao Paulo",
      addressRegion: "SP",
    },
  },
  image: DEFAULT_IMAGE,
  organizer: {
    "@type": "Organization",
    name: "Caminho do Perdao",
    url: SEO_BASE_URL,
  },
  performer: {
    "@type": "Organization",
    name: "Caminho do Perdao",
    url: SEO_BASE_URL,
  },
  offers: {
    "@type": "Offer",
    url: SEO_BASE_URL,
    availability: "https://schema.org/InStock",
  },
  url: SEO_BASE_URL,
});

export const buildFaqSchema = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O que e a peregrinacao Caminho do Perdao?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "E uma jornada espiritual com momentos de reflexao, oracao e autoconhecimento para quem deseja viver o perdao de forma pratica.",
      },
    },
    {
      "@type": "Question",
      name: "Como faco minha inscricao?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Voce pode realizar a inscricao diretamente no formulario da pagina inicial e acompanhar o status do pagamento online.",
      },
    },
    {
      "@type": "Question",
      name: "A peregrinacao acontece em Sao Paulo?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Sim. O evento acontece em Sao Paulo e os detalhes de local e horario ficam disponiveis durante o processo de inscricao.",
      },
    },
  ],
});

export const buildWebPageSchema = (title: string, description: string, url: string): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url,
  inLanguage: "pt-BR",
});

export const buildCollectionPageSchema = (url: string): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Galeria Caminho do Perdao",
  description: "Fotos e registros da peregrinacao Caminho do Perdao.",
  url,
  image: DEFAULT_IMAGE,
});

type BreadcrumbItem = {
  name: string;
  item: string;
};

export const buildBreadcrumbSchema = (items: BreadcrumbItem[]): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.name,
    item: entry.item,
  })),
});
