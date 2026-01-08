import { AvailabilityResponse } from "../../../services/landing/landing.types";

export type LandingPhase = "check" | "form" | "status";

export type LandingTone = "success" | "warn" | "error" | null;

export interface LandingContent {
  hero: HeroSection;
  features: FeatureSection[];
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

export interface CallToActionSection {
  title: string;
  description: string;
  buttonText: string;
  buttonAction: string;
}

export interface AvailabilityState extends AvailabilityResponse {
  loading: boolean;
  error?: string;
}
