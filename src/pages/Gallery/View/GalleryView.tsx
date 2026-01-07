import React from "react";
import Header from "../../../components/Header";
import { GalleryContent } from "../Model";
import "./GalleryView.css";

interface GalleryViewProps {
  content: GalleryContent;
  onOpenAlbum: (year: number) => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ content, onOpenAlbum }) => {
  return (
    <div className="gallery-page">
      <Header />

      <section className="gallery-hero">
        <div className="container">
          <h1>{content.heroTitle}</h1>
          <p>{content.heroDescription}</p>
        </div>
      </section>

      <section className="gallery-list-section">
        <div className="container">
          <div className="album-grid">
            {content.albums.map(album => (
              <article key={album.year} className="album-card">
                <div className="album-header">
                  <div className="album-year">{album.year}</div>
                  <span className="album-status">{album.status ?? "Disponível"}</span>
                </div>
                <div className="album-thumb-placeholder">{album.thumbnailText ?? "Foto destaque"}</div>
                <button className="album-button" onClick={() => onOpenAlbum(album.year)}>
                  Ver fotos do álbum
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default GalleryView;
