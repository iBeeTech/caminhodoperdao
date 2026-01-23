export interface GalleryPhoto {
  url: string;
  alt?: string;
}

export interface Album {
  year: number;
  photos: GalleryPhoto[];
  status?: string;
  thumbnailText?: string;
  coverUrl?: string;
}

export interface GalleryContent {
  heroTitle: string;
  heroDescription: string;
  albums: Album[];
}
