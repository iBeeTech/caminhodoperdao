import React from "react";
import { Button } from "../../../../../components";
import { CallToActionSection } from "../../../Model";
import { Container, CtaContent, CtaDescription, CtaSectionWrapper, CtaTitle } from "./CtaSection.styles";

interface CtaSectionProps {
  callToAction: CallToActionSection;
  onCallToAction: () => void;
}

const CtaSection: React.FC<CtaSectionProps> = ({ callToAction, onCallToAction }) => {
  return (
    <CtaSectionWrapper>
      <Container>
        <CtaContent>
          <CtaTitle>{callToAction.title}</CtaTitle>
          <CtaDescription>{callToAction.description}</CtaDescription>
          <Button variant="cta" size="lg" onClick={onCallToAction}>
            {callToAction.buttonText}
          </Button>
        </CtaContent>
      </Container>
    </CtaSectionWrapper>
  );
};

export default CtaSection;
