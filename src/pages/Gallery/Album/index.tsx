import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AlbumView from "./AlbumView";
import { Album, GalleryPhoto } from "../Model";

interface GalleryApiAlbum {
  year: number;
  photos?: GalleryPhoto[];
}

interface GalleryApiResponse {
  albums?: GalleryApiAlbum[];
}

const GalleryAlbum: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const year = Number(params.year);
  const [album, setAlbum] = React.useState<Album | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(year)) {
      setAlbum({ year: 0, photos: [] });
      return;
    }
    const galleryUrl =
      process.env.REACT_APP_GALLERY_API_URL ||
      process.env.REACT_APP_GALLERY_JSON_URL ||
      "/gallery/gallery.json";
    const controller = new AbortController();

    const loadAlbum = async () => {
      try {
        const response = await fetch(galleryUrl, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as GalleryApiResponse;
        const match = data?.albums?.find(item => Number(item.year) === year);
        if (match) {
          setAlbum({
            year,
            photos: Array.isArray(match.photos) ? match.photos : [],
          });
        } else {
          setAlbum({ year, photos: [] });
        }
      } catch {
        setAlbum({ year, photos: [] });
      }
    };

    loadAlbum();

    return () => controller.abort();
  }, [year]);

  if (!album || !Number.isFinite(year)) {
    return <AlbumView year={year} photos={[]} onBack={() => navigate("/gallery")} />;
  }

  return <AlbumView year={album.year} photos={album.photos} onBack={() => navigate("/gallery")} />;
};

export default GalleryAlbum;

