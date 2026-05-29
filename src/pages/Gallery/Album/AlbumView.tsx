import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlbumContainer,
  AlbumGrid,
  AlbumHeader,
  AlbumPage,
  AlbumTitle,
  BackButton,
  EmptyState,
  ModalClose,
  ModalContent,
  ModalImage,
  ModalOverlay,
  PhotoCard,
  PhotoImage,
} from "./AlbumView.styles";
import { GalleryPhoto } from "../Model";

interface AlbumViewProps {
  year: number;
  photos: GalleryPhoto[];
  onBack: () => void;
}

const AlbumView: React.FC<AlbumViewProps> = ({ year, photos, onBack }) => {
  const { t } = useTranslation("gallery");
  const [selectedPhoto, setSelectedPhoto] = React.useState<GalleryPhoto | null>(null);

  return (
    <AlbumPage>
      <AlbumContainer>
        <AlbumHeader>
          <AlbumTitle>{t("album.title", { year })}</AlbumTitle>
          <BackButton type="button" onClick={onBack}>
            {t("album.back")}
          </BackButton>
        </AlbumHeader>

        {photos.length === 0 ? (
          <EmptyState>{t("album.empty")}</EmptyState>
        ) : (
          <AlbumGrid>
            {photos.map((photo, index) => (
              <PhotoCard key={`${photo.url}-${index}`} onClick={() => setSelectedPhoto(photo)}>
                <PhotoImage
                  src={photo.url}
                  alt={photo.alt ?? t("album.photoAlt", { index: index + 1, year })}
                  loading="lazy"
                />
              </PhotoCard>
            ))}
          </AlbumGrid>
        )}
      </AlbumContainer>

      {selectedPhoto && (
        <ModalOverlay onClick={() => setSelectedPhoto(null)}>
          <ModalContent onClick={event => event.stopPropagation()}>
            <ModalClose type="button" onClick={() => setSelectedPhoto(null)}>
              ×
            </ModalClose>
            <ModalImage
              src={selectedPhoto.url}
              alt={selectedPhoto.alt ?? t("album.modalAlt", { year })}
            />
          </ModalContent>
        </ModalOverlay>
      )}
    </AlbumPage>
  );
};

export default AlbumView;

