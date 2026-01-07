import React from "react";
import { useTranslation } from "react-i18next";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { FeatureSection } from "../../../Model";
import {
  Container,
  FeatureCard,
  FeatureDescription,
  FeatureIcon,
  FeatureTitle,
  FeaturesGrid,
  FeaturesSectionWrapper,
  Title,
} from "./FeaturesSection.styles";

interface FeaturesSectionProps {
  features: FeatureSection[];
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => {
  const { t } = useTranslation("landing");
  useSectionView("features", "features");

  return (
    <FeaturesSectionWrapper>
      <Container>
        <Title>{t("features.title")}</Title>
        <FeaturesGrid>
          {features.map(feature => (
            <FeatureCard key={feature.id}>
              <FeatureIcon src={feature.icon} alt={feature.title} loading="lazy" />
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </Container>
    </FeaturesSectionWrapper>
  );
};

export default FeaturesSection;
