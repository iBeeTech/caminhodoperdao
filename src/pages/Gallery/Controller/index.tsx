import React from "react";
import GalleryView from "../View/GalleryView";
import { defaultGalleryContent } from "../Model";

const GalleryController: React.FC = () => {
  return (
    <GalleryView
      content={defaultGalleryContent}
      onOpenAlbum={year => {
        alert(`Abrir fotos do álbum ${year}. Integrar com DB por ano.`);
      }}
    />
  );
};

export default GalleryController;
