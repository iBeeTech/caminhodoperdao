import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AlbumView from "./AlbumView";
import AlbumFotos from "./AlbumFotos";
import { Album, GalleryPhoto } from "../Model";
import { AlbumManifesto, buscarAlbum } from "../../../services/fotos/fotos.service";

interface GalleryApiAlbum {
  year: number;
  photos?: GalleryPhoto[];
}

interface GalleryApiResponse {
  albums?: GalleryApiAlbum[];
}

/**
 * Abre o álbum de um ano.
 *
 * Dois caminhos convivem aqui de propósito:
 *
 *   ano com fotos no R2 (2026 em diante) -> AlbumFotos, com escolha e compra
 *   anos antigos, ainda no GitHub        -> AlbumView, a tela simples de sempre
 *
 * A troca é decidida pela existência do índice em /api/fotos/album, e não por
 * uma lista de anos escrita no código: quando 2027 subir pelo mesmo caminho, ele
 * já cai na tela nova sem ninguém lembrar de mexer aqui.
 */
const GalleryAlbum: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const year = Number(params.year);
  const [manifesto, setManifesto] = React.useState<AlbumManifesto | null>(null);
  const [album, setAlbum] = React.useState<Album | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(year)) {
      setAlbum({ year: 0, photos: [] });
      return undefined;
    }

    const controller = new AbortController();

    const carregar = async () => {
      try {
        const doR2 = await buscarAlbum(year, controller.signal);
        if (doR2 && doR2.fotos?.length) {
          setManifesto(doR2);
          return;
        }
      } catch {
        // Sem álbum no R2: segue para a galeria antiga.
      }

      const galleryUrl =
        process.env.REACT_APP_GALLERY_API_URL ||
        process.env.REACT_APP_GALLERY_JSON_URL ||
        "/gallery/gallery.json";

      try {
        const response = await fetch(galleryUrl, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as GalleryApiResponse;
        const match = data?.albums?.find(item => Number(item.year) === year);
        setAlbum({
          year,
          photos: match && Array.isArray(match.photos) ? match.photos : [],
        });
      } catch {
        setAlbum({ year, photos: [] });
      }
    };

    carregar();

    return () => controller.abort();
  }, [year]);

  if (manifesto) {
    return <AlbumFotos manifesto={manifesto} onBack={() => navigate("/gallery")} />;
  }

  if (!album || !Number.isFinite(year)) {
    return <AlbumView year={year} photos={[]} onBack={() => navigate("/gallery")} />;
  }

  return <AlbumView year={album.year} photos={album.photos} onBack={() => navigate("/gallery")} />;
};

export default GalleryAlbum;
