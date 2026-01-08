import { useQuery } from "@tanstack/react-query";
import { Testimonial } from "../services/landing/testimonials.types";

const fetchTestimonials = async (
  featured?: boolean,
  limit?: number
): Promise<Testimonial[]> => {
  const params = new URLSearchParams();
  if (featured) {
    params.append("featured", "true");
  }

  const apiUrl = process.env.REACT_APP_API_URL || "";
  const response = await fetch(`${apiUrl}/api/testimonials?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch testimonials");
  }

  const data = await response.json();
  let testimonials = data.data || [];

  // Shuffle and limit results
  if (limit && limit > 0) {
    testimonials = testimonials
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
  }

  return testimonials;
};

export const useTestimonials = (featured?: boolean, limit?: number) => {
  return useQuery({
    queryKey: ["testimonials", featured, limit],
    queryFn: () => fetchTestimonials(featured, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
};
