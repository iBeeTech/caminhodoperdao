export interface Album {
  year: number;
  photos: number;
  status?: string;
  thumbnailText?: string;
}

export interface GalleryContent {
  heroTitle: string;
  heroDescription: string;
  albums: Album[];
}

export const defaultGalleryContent: GalleryContent = {
  heroTitle: "Galeria de Fotos",
  heroDescription: "Reviva cada edição do Caminho do Perdão. Escolha o ano para abrir o álbum correspondente.",
  albums: [
    { year: 2026, photos: 0, status: "Em breve", thumbnailText: "Foto destaque do ano" },
    { year: 2025, photos: 0, status: "Em breve", thumbnailText: "Foto destaque do ano" },
    { year: 2024, photos: 0, status: "Em breve", thumbnailText: "Foto destaque do ano" },
  ],
};
