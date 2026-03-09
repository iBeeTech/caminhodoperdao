import { matchPath } from "react-router-dom";
import {
  SEO_BASE_URL,
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildEventSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildWebPageSchema,
  type JsonLd,
} from "./schemas";

type SeoRouteConfig = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  robots?: string;
  getSchemas?: (canonicalUrl: string, pathname: string) => JsonLd[];
};

export type ResolvedSeoConfig = {
  title: string;
  description: string;
  keywords: string;
  robots: string;
  canonical: string;
  image: string;
  schemas: JsonLd[];
};

const DEFAULT_IMAGE = `${SEO_BASE_URL}/og-image.png`;

const ROUTE_SEO: SeoRouteConfig[] = [
  {
    path: "/",
    title: "Caminho do Perdao | Peregrinacao e Transformacao Espiritual",
    description:
      "Participe da peregrinacao Caminho do Perdao em Sao Paulo. Uma jornada espiritual de autoconhecimento, fe e reconciliacao.",
    keywords:
      "peregrinacao, peregrinacao em sao paulo, retiro espiritual, caminho do perdao, jornada espiritual, inscricao peregrinacao",
    getSchemas: (canonicalUrl) => [
      buildOrganizationSchema(),
      buildEventSchema(),
      buildFaqSchema(),
      buildWebPageSchema(
        "Caminho do Perdao | Peregrinacao e Transformacao Espiritual",
        "Participe da peregrinacao Caminho do Perdao em Sao Paulo.",
        canonicalUrl
      ),
    ],
  },
  {
    path: "/gallery",
    title: "Galeria da Peregrinacao | Caminho do Perdao",
    description:
      "Veja fotos e momentos da peregrinacao Caminho do Perdao. Registros de uma jornada de espiritualidade e transformacao.",
    keywords: "galeria peregrinacao, fotos caminho do perdao, retiro espiritual fotos",
    getSchemas: (canonicalUrl) => [
      buildCollectionPageSchema(canonicalUrl),
      buildBreadcrumbSchema([
        { name: "Inicio", item: SEO_BASE_URL },
        { name: "Galeria", item: canonicalUrl },
      ]),
      buildWebPageSchema(
        "Galeria da Peregrinacao | Caminho do Perdao",
        "Veja fotos e momentos da peregrinacao Caminho do Perdao.",
        canonicalUrl
      ),
    ],
  },
  {
    path: "/gallery/:year",
    title: "Galeria por Ano | Caminho do Perdao",
    description:
      "Acesse a galeria por ano com registros da peregrinacao Caminho do Perdao.",
    keywords: "galeria peregrinacao por ano, fotos caminho do perdao",
    getSchemas: (canonicalUrl, pathname) => [
      buildCollectionPageSchema(canonicalUrl),
      buildBreadcrumbSchema([
        { name: "Inicio", item: SEO_BASE_URL },
        { name: "Galeria", item: `${SEO_BASE_URL}/gallery` },
        { name: pathname.split("/").pop() || "Ano", item: canonicalUrl },
      ]),
      buildWebPageSchema(
        "Galeria por Ano | Caminho do Perdao",
        "Acesse a galeria por ano com registros da peregrinacao Caminho do Perdao.",
        canonicalUrl
      ),
    ],
  },
  {
    path: "/responsabilityTerms",
    title: "Termo de Responsabilidade | Caminho do Perdao",
    description: "Leia os termos e responsabilidades para participar do Caminho do Perdao.",
    keywords: "termo de responsabilidade, inscricao caminho do perdao",
    getSchemas: (canonicalUrl) => [
      buildBreadcrumbSchema([
        { name: "Inicio", item: SEO_BASE_URL },
        { name: "Termo de Responsabilidade", item: canonicalUrl },
      ]),
      buildWebPageSchema(
        "Termo de Responsabilidade | Caminho do Perdao",
        "Leia os termos e responsabilidades para participar do Caminho do Perdao.",
        canonicalUrl
      ),
    ],
  },
  {
    path: "/admin",
    title: "Area Administrativa | Caminho do Perdao",
    description: "Area administrativa do Caminho do Perdao.",
    keywords: "admin",
    robots: "noindex, nofollow",
  },
  {
    path: "/error",
    title: "Pagina nao encontrada | Caminho do Perdao",
    description: "A pagina solicitada nao foi encontrada.",
    keywords: "erro 404",
    robots: "noindex, nofollow",
  },
];

const FALLBACK_SEO: SeoRouteConfig = {
  path: "*",
  title: "Caminho do Perdao",
  description: "Caminho do Perdao - peregrinacao e transformacao espiritual.",
  keywords: "caminho do perdao, peregrinacao",
};

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
};

export const resolveSeoConfig = (pathname: string): ResolvedSeoConfig => {
  const normalizedPath = normalizePath(pathname);
  const routeConfig =
    ROUTE_SEO.find((entry) => matchPath({ path: entry.path, end: true }, normalizedPath)) || FALLBACK_SEO;

  const canonical = `${SEO_BASE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`;
  const schemas = routeConfig.getSchemas ? routeConfig.getSchemas(canonical, normalizedPath) : [];

  return {
    title: routeConfig.title,
    description: routeConfig.description,
    keywords: routeConfig.keywords,
    robots: routeConfig.robots || "index, follow",
    canonical,
    image: DEFAULT_IMAGE,
    schemas,
  };
};
