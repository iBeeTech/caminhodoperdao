export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image?: string;
  rating?: number;
  featured: number;
  created_at: string;
}
