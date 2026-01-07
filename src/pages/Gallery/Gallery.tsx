import React from "react";
import Header from "../../components/Header";
import "./Gallery.css";

const albums = [
  { year: 2026, photos: 0 },
  { year: 2025, photos: 0 },
  { year: 2024, photos: 0 },
];

const Gallery: React.FC = () => {
  return (
    <div className="gallery-page">
      <Header />

      <section className="gallery-hero">
        <div className="container">
          <h1>Galeria de Fotos</h1>
          <p>Reviva cada edição do Caminho do Perdão. Escolha o ano para abrir o álbum correspondente.</p>
        </div>
      </section>

      <section className="gallery-list-section">
        <div className="container">
          <div className="album-grid">
            {albums.map(album => (
              <article key={album.year} className="album-card">
                <div className="album-header">
                  <div className="album-year">{album.year}</div>
                  <span className="album-status">Em breve</span>
                </div>
                <div className="album-thumb-placeholder">Foto destaque do ano</div>
                <button
                  className="album-button"
                  onClick={() => alert(`Abrir fotos do álbum ${album.year}. Integrar com DB por ano.`)}
                >
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

export default Gallery;
