import React from "react";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import { CallToActionSection } from "../../../Model";
import { Container, CtaContent, CtaDescription, CtaSectionWrapper, CtaTitle } from "./CtaSection.styles";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";

interface CtaSectionProps {
  callToAction: CallToActionSection;
  onCallToAction: () => void;
}

const CtaSection: React.FC<CtaSectionProps> = ({ callToAction, onCallToAction }) => {
  return (
    <CtaSectionWrapper id="cta">
      <Container>
        <CtaContent>
          <CtaTitle>{callToAction.title}</CtaTitle>
          <CtaDescription>{callToAction.description}</CtaDescription>
          <TrackedButton
            pageName="landing"
            ctaId={LANDING_CTAS.CTA_PRIMARY}
            sectionId={LANDING_SECTIONS.CTA.id}
            sectionName={LANDING_SECTIONS.CTA.name}
            position={LANDING_SECTIONS.CTA.position}
            variant="cta"
            size="lg"
            onClick={onCallToAction}
          >
            {callToAction.buttonText}
          </TrackedButton>
        </CtaContent>
      </Container>
    </CtaSectionWrapper>
  );
};

export default CtaSection;
