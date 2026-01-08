import React from "react";
import { useTranslation } from "react-i18next";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import { HeroSection as HeroContent } from "../../../Model";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import {
  HeroActions,
  HeroContainer,
  HeroContent as HeroContentWrapper,
  HeroDescription,
  HeroImage,
  HeroImageWrapper,
  HeroSectionWrapper,
  HeroSubtitle,
  HeroTitle,
  HeroVisual,
} from "./HeroSection.styles";

interface HeroSectionProps {
  hero: HeroContent;
  heroImage: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ hero, heroImage, onPrimaryAction, onSecondaryAction }) => {
  const { t } = useTranslation("landing");

  return (
    <HeroSectionWrapper id="home">
      <HeroContainer>
        <HeroContentWrapper>
          <HeroTitle>{hero.title}</HeroTitle>
          <HeroSubtitle>{hero.subtitle}</HeroSubtitle>
          <HeroDescription>{hero.description}</HeroDescription>
          <HeroActions>
            <TrackedButton
              pageName="landing"
              ctaId={LANDING_CTAS.HERO_PRIMARY}
              sectionId={LANDING_SECTIONS.HERO.id}
              sectionName={LANDING_SECTIONS.HERO.name}
              position={LANDING_SECTIONS.HERO.position}
              variant="ghost"
              size="lg"
              onClick={onPrimaryAction}
            >
              {hero.primaryButtonText}
            </TrackedButton>
            <TrackedButton
              pageName="landing"
              ctaId={LANDING_CTAS.HERO_SECONDARY}
              sectionId={LANDING_SECTIONS.HERO.id}
              sectionName={LANDING_SECTIONS.HERO.name}
              position={LANDING_SECTIONS.HERO.position}
              variant="secondary"
              size="lg"
              onClick={onSecondaryAction}
            >
              {hero.secondaryButtonText}
            </TrackedButton>
          </HeroActions>
        </HeroContentWrapper>
        <HeroVisual>
          <HeroImageWrapper>
            <HeroImage src={heroImage} alt={t("hero.imageAlt") as string} />
          </HeroImageWrapper>
        </HeroVisual>
      </HeroContainer>
    </HeroSectionWrapper>
  );
};

export default HeroSection;
