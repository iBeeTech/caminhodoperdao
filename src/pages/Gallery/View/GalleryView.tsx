import React from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../../../components";
import { GalleryContent } from "../Model";
import {
  AlbumButton,
  AlbumCard,
  AlbumGrid,
  AlbumHeader,
  AlbumStatus,
  AlbumThumb,
  AlbumYear,
  Container,
  GalleryHero,
  GalleryListSection,
  GalleryPage,
} from "./GalleryView.styles";

interface GalleryViewProps {
  content: GalleryContent;
  onOpenAlbum: (year: number) => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ content, onOpenAlbum }) => {
  const { t } = useTranslation();

  return (
    <GalleryPage>
      <Header />

      <GalleryHero>
        <Container>
          <h1>{content.heroTitle}</h1>
          <p>{content.heroDescription}</p>
        </Container>
      </GalleryHero>

      <GalleryListSection>
        <Container>
          <AlbumGrid>
            {content.albums.map(album => (
              <AlbumCard key={album.year}>
                <AlbumHeader>
                  <AlbumYear>{album.year}</AlbumYear>
                  <AlbumStatus>{album.status ?? (t("albums.defaultStatus") as string)}</AlbumStatus>
                </AlbumHeader>
                <AlbumThumb>{album.thumbnailText ?? (t("albums.placeholderThumb") as string)}</AlbumThumb>
                <AlbumButton onClick={() => onOpenAlbum(album.year)}>{t("actions.viewAlbum")}</AlbumButton>
              </AlbumCard>
            ))}
          </AlbumGrid>
        </Container>
      </GalleryListSection>
    </GalleryPage>
  );
};

export default GalleryView;
