import React from "react";
import { useLocation } from "react-router-dom";
import { resolveSeoConfig } from "../../seo/seoConfig";

const upsertMetaByName = (name: string, content: string): void => {
  let element = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertMetaByProperty = (property: string, content: string): void => {
  let element = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertCanonical = (href: string): void => {
  let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
};

const clearManagedSchemas = (): void => {
  document
    .querySelectorAll("script[data-cpd-seo-jsonld='true']")
    .forEach((element) => element.parentNode?.removeChild(element));
};

const appendSchemas = (schemas: Array<Record<string, unknown>>): void => {
  clearManagedSchemas();
  schemas.forEach((schema) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-cpd-seo-jsonld", "true");
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  });
};

const SeoManager: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const seo = resolveSeoConfig(location.pathname);

    document.title = seo.title;
    document.documentElement.setAttribute("lang", "pt-BR");

    upsertCanonical(seo.canonical);
    upsertMetaByName("description", seo.description);
    upsertMetaByName("keywords", seo.keywords);
    upsertMetaByName("robots", seo.robots);
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", seo.title);
    upsertMetaByName("twitter:description", seo.description);
    upsertMetaByName("twitter:image", seo.image);

    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:title", seo.title);
    upsertMetaByProperty("og:description", seo.description);
    upsertMetaByProperty("og:url", seo.canonical);
    upsertMetaByProperty("og:image", seo.image);
    upsertMetaByProperty("og:locale", "pt_BR");

    appendSchemas(seo.schemas);
  }, [location.pathname]);

  return null;
};

export default SeoManager;
