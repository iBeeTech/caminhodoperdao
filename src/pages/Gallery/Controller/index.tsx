import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../../../hooks/useAnalytics";
import GalleryView from "../View/GalleryView";
import { GalleryContent } from "../Model";

const GalleryController: React.FC = () => {
  const { t, i18n } = useTranslation("gallery");
  const { trackGalleryView, trackGalleryAlbumClick } = useAnalytics();

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
    [i18n.language, t]
  );

  React.useEffect(() => {
    trackGalleryView();
  }, [trackGalleryView]);

  return (
    <GalleryView
      content={galleryContent}
      onOpenAlbum={year => {
        trackGalleryAlbumClick(year);
        alert(t("actions.openAlbum", { year }));
      }}
    />
  );
};

export default GalleryController;
