import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "../../../hooks/useAnalytics";
import GalleryView from "../View/GalleryView";
import { Album, GalleryContent, GalleryPhoto } from "../Model";
import { GALLERY_CTAS } from "../../../utils/analytics/catalog/ctas";
import { GALLERY_SECTIONS } from "../../../utils/analytics/catalog/sections";

interface GalleryApiAlbum {
  year: number;
  status?: string;
  coverUrl?: string;
  photos?: GalleryPhoto[];
}

interface GalleryApiResponse {
  albums?: GalleryApiAlbum[];
}

const FALLBACK_ALBUMS: Album[] = [2026, 2025].map(year => ({
  year,
  photos: [],
}));

const GalleryController: React.FC = () => {
  const { t } = useTranslation("gallery");
  const { galleryViewed, galleryAlbumClicked } = useAnalytics();
  const navigate = useNavigate();
  const [albums, setAlbums] = React.useState<Album[]>(FALLBACK_ALBUMS);

  React.useEffect(() => {
    const galleryUrl =
      process.env.REACT_APP_GALLERY_API_URL ||
      process.env.REACT_APP_GALLERY_JSON_URL ||
      "/gallery/gallery.json";
    const controller = new AbortController();

    const loadGallery = async () => {
      try {
        const response = await fetch(galleryUrl, { signal: controller.signal });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as GalleryApiResponse;
        const normalized = normalizeAlbums(data?.albums);
        if (normalized.length) {
          setAlbums(normalized);
        }
      } catch {
        // keep fallback albums
      }
    };

    loadGallery();

    return () => controller.abort();
  }, []);

  const galleryContent: GalleryContent = useMemo(
    () => ({
      heroTitle: t("hero.title"),
      heroDescription: t("hero.description"),
      albums: albums.map(album => ({
        ...album,
        status:
          album.status ??
          (album.photos.length ? t("albums.defaultStatus") : t("albums.comingSoon")),
        thumbnailText: album.photos.length ? undefined : t("albums.placeholderThumb"),
      })),
    }),
    [albums, t]
  );

  React.useEffect(() => {
    galleryViewed("/gallery");
  }, [galleryViewed]);

  return (
    <GalleryView
      content={galleryContent}
      onOpenAlbum={year => {
        galleryAlbumClicked(year, year.toString(), {
          section_id: GALLERY_SECTIONS.ALBUM_LIST.id,
          section_name: GALLERY_SECTIONS.ALBUM_LIST.name,
          position: GALLERY_SECTIONS.ALBUM_LIST.position,
          cta_id: GALLERY_CTAS.VIEW_ALBUM,
        });
        navigate(`/gallery/${year}`);
      }}
    />
  );
};

export default GalleryController;

function normalizeAlbums(albums?: GalleryApiAlbum[]): Album[] {
  if (!Array.isArray(albums)) {
    return [];
  }
  return albums
    .filter(album => Number.isFinite(album.year))
    .map(album => ({
      year: Number(album.year),
      status: album.status,
      coverUrl: album.coverUrl,
      photos: Array.isArray(album.photos)
        ? album.photos.filter(photo => typeof photo.url === "string")
        : [],
    }));
}
