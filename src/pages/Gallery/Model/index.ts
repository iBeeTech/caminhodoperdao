export interface Album {
  year: number;
  photos: number;
  status?: string;
  thumbnailText?: string;
}

export interface GalleryContent {
  heroTitle: string;
  heroDescription: string;
  albums: Album[];
}
