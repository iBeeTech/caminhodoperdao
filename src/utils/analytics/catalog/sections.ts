// Catalogo padronizado de IDs de secoes (snake_case)
// Mantem consistencia entre eventos section_viewed e CTA context

export const LANDING_SECTIONS = {
  HERO: { id: "hero", name: "hero", position: "top" },
  REGISTRATION_FORM: { id: "registration_form", name: "registration_form", position: "top" },
  SCHEDULE: { id: "schedule", name: "schedule", position: "middle" },
  HISTORY: { id: "history", name: "history", position: "middle" },
  FEATURES: { id: "features", name: "features", position: "middle" },
  TESTIMONIALS: { id: "testimonials", name: "testimonials", position: "middle" },
  CTA: { id: "cta", name: "cta", position: "bottom" },
  FOOTER: { id: "footer", name: "footer", position: "bottom" },
} as const;

export const GALLERY_SECTIONS = {
  HERO: { id: "gallery_hero", name: "gallery_hero", position: "top" },
  ALBUM_LIST: { id: "gallery_albums", name: "gallery_albums", position: "middle" },
} as const;

type SectionEntry = { id: string; name: string; position?: string };
export type SectionCatalog = Record<string, SectionEntry>;
