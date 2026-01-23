import React from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../../../components";
import { GalleryContent } from "../Model";
import TrackSection from "../../../components/analytics/TrackSection";
import { GALLERY_SECTIONS } from "../../../utils/analytics/catalog/sections";
import {
  AlbumButton,
  AlbumCard,
  AlbumGrid,
  AlbumHeader,
  AlbumPhotoCard,
  AlbumPhotoGrid,
  AlbumPhotoImage,
  AlbumPhotoSection,
  AlbumPhotoTitle,
  AlbumStatus,
  AlbumThumb,
  AlbumThumbImage,
  AlbumYear,
  Container,
  GalleryHero,
  GalleryListSection,
  GalleryPage,
  GalleryMain,
} from "./GalleryView.styles";

interface GalleryViewProps {
  content: GalleryContent;
  onOpenAlbum: (year: number) => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ content, onOpenAlbum }) => {
  const { t } = useTranslation("gallery");

  return (
    <GalleryPage>
      <Header />

      <GalleryMain id="main-content">
        <TrackSection
          pageName="gallery"
          sectionId={GALLERY_SECTIONS.HERO.id}
          sectionName={GALLERY_SECTIONS.HERO.name}
          position={GALLERY_SECTIONS.HERO.position}
        >
          <GalleryHero>
            <Container>
              <h1>{content.heroTitle}</h1>
              <p>{content.heroDescription}</p>
            </Container>
          </GalleryHero>
        </TrackSection>

        <TrackSection
          pageName="gallery"
          sectionId={GALLERY_SECTIONS.ALBUM_LIST.id}
          sectionName={GALLERY_SECTIONS.ALBUM_LIST.name}
          position={GALLERY_SECTIONS.ALBUM_LIST.position}
        >
          <GalleryListSection>
            <Container>
              <AlbumGrid>
                {content.albums.map(album => (
                  <AlbumCard key={album.year}>
                    <AlbumHeader>
                      <AlbumYear as="h2">{album.year}</AlbumYear>
                      <AlbumStatus>{album.status ?? (t("albums.defaultStatus") as string)}</AlbumStatus>
                    </AlbumHeader>
                    <AlbumThumb>
                      {album.coverUrl || album.photos[0]?.url ? (
                        <AlbumThumbImage
                          src={album.coverUrl || album.photos[0]?.url}
                          alt={`Capa do álbum ${album.year}`}
                          loading="lazy"
                        />
                      ) : (
                        album.thumbnailText ?? (t("albums.placeholderThumb") as string)
                      )}
                    </AlbumThumb>
                    <AlbumButton
                      type="button"
                      onClick={() => onOpenAlbum(album.year)}
                      disabled={!album.photos.length}
                    >
                      {t("actions.viewAlbum")}
                    </AlbumButton>
                  </AlbumCard>
                ))}
              </AlbumGrid>
            </Container>
          </GalleryListSection>
        </TrackSection>

        {content.albums
          .filter(album => album.photos.length)
          .map(album => (
            <AlbumPhotoSection key={album.year} id={`album-${album.year}`}>
              <Container>
                <AlbumPhotoTitle>{`Fotos ${album.year}`}</AlbumPhotoTitle>
                <AlbumPhotoGrid>
                  {album.photos.map((photo, index) => (
                    <AlbumPhotoCard key={`${album.year}-${index}`}>
                      <AlbumPhotoImage
                        src={photo.url}
                        alt={photo.alt ?? `Foto ${index + 1} do álbum ${album.year}`}
                        loading="lazy"
                      />
                    </AlbumPhotoCard>
                  ))}
                </AlbumPhotoGrid>
              </Container>
            </AlbumPhotoSection>
          ))}
      </GalleryMain>
    </GalleryPage>
  );
};

export default GalleryView;
