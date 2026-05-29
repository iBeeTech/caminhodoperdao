import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { hasStoredConsent, saveConsent } from "../../utils/consent";

const ConsentModal: React.FC = () => {
  const { t } = useTranslation("common");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(!hasStoredConsent());
  }, []);

  const handleChoice = (analytics: boolean) => {
    saveConsent(analytics);
    setOpen(false);

    if (analytics) {
      import("../../services/analytics/amplitude").then(({ initAmplitude }) => {
        initAmplitude();
      });
    }
  };

  if (!open) return null;

  return (
    <BannerContainer>
      <Dialog role="dialog" aria-live="polite" aria-labelledby="consent-title">
        <Title id="consent-title">{t("consent.title")}</Title>
        <Description>{t("consent.description")}</Description>
        <Actions>
          <SecondaryButton type="button" onClick={() => handleChoice(false)}>
            {t("consent.refuse")}
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => handleChoice(true)}>
            {t("consent.accept")}
          </PrimaryButton>
        </Actions>
      </Dialog>
    </BannerContainer>
  );
};

const BannerContainer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 10px;
  pointer-events: none;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 640px;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  pointer-events: auto;
  border: 1px solid #e5e7eb;
`;

const Title = styled.h2`
  margin: 0 0 8px;
  color: #111827;
  font-size: 1rem;
`;

const Description = styled.p`
  margin: 0;
  color: #374151;
  line-height: 1.35;
  font-size: 0.88rem;
`;

const Actions = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  border: none;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
`;

const PrimaryButton = styled(Button)`
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
`;

const SecondaryButton = styled(Button)`
  background: #e5e7eb;
  color: #111827;
`;

export default ConsentModal;
