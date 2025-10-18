// Models para a página Landing
export interface LandingContent {
  hero: HeroSection;
  features: FeatureSection[];
  testimonials: Testimonial[];
  callToAction: CallToActionSection;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  backgroundImage?: string;
}

export interface FeatureSection {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  avatar?: string;
  rating: number;
}

export interface CallToActionSection {
  title: string;
  description: string;
  buttonText: string;
  buttonAction: string;
}