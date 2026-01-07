import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../../components";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { HeroSection as HeroContent } from "../../../Model";
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
  useSectionView("home", "hero");

  return (
    <HeroSectionWrapper id="home">
      <HeroContainer>
        <HeroContentWrapper>
          <HeroTitle>{hero.title}</HeroTitle>
          <HeroSubtitle>{hero.subtitle}</HeroSubtitle>
          <HeroDescription>{hero.description}</HeroDescription>
          <HeroActions>
            <Button variant="ghost" size="lg" onClick={onPrimaryAction}>
              {hero.primaryButtonText}
            </Button>
            <Button variant="secondary" size="lg" onClick={onSecondaryAction}>
              {hero.secondaryButtonText}
            </Button>
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
