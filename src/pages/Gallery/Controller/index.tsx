import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../../../hooks/useAnalytics";
import GalleryView from "../View/GalleryView";
import { GalleryContent } from "../Model";
import { GALLERY_CTAS } from "../../../utils/analytics/catalog/ctas";
import { GALLERY_SECTIONS } from "../../../utils/analytics/catalog/sections";

const GalleryController: React.FC = () => {
  const { t } = useTranslation("gallery");
  const { galleryViewed, galleryAlbumClicked } = useAnalytics();

  const galleryContent: GalleryContent = useMemo(
    () => ({
      heroTitle: t("hero.title"),
      heroDescription: t("hero.description"),
      albums: [2026, 2025, 2024].map(year => ({
        year,
        photos: 0,
        status: t("albums.comingSoon"),
        thumbnailText: t("albums.placeholderThumb"),
      })),
    }),
    [t]
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
        alert(t("actions.openAlbum", { year }));
      }}
    />
  );
};

export default GalleryController;
