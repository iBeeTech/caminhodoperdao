import React from "react";
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
  const [selectedPhoto, setSelectedPhoto] = React.useState<GalleryPhoto | null>(null);

  return (
    <AlbumPage>
      <AlbumContainer>
        <AlbumHeader>
          <AlbumTitle>{`Fotos ${year}`}</AlbumTitle>
          <BackButton type="button" onClick={onBack}>
            Voltar
          </BackButton>
        </AlbumHeader>

        {photos.length === 0 ? (
          <EmptyState>Em breve.</EmptyState>
        ) : (
          <AlbumGrid>
            {photos.map((photo, index) => (
              <PhotoCard key={`${photo.url}-${index}`} onClick={() => setSelectedPhoto(photo)}>
                <PhotoImage
                  src={photo.url}
                  alt={photo.alt ?? `Foto ${index + 1} do álbum ${year}`}
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
              alt={selectedPhoto.alt ?? `Foto do álbum ${year}`}
            />
          </ModalContent>
        </ModalOverlay>
      )}
    </AlbumPage>
  );
};

export default AlbumView;

