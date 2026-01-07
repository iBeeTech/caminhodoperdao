import React from "react";
import { useTranslation } from "react-i18next";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { Container, HistorySectionWrapper, HistoryText, Title } from "./HistorySection.styles";

const HistorySection: React.FC = () => {
  const { t } = useTranslation("landing");
  useSectionView("about", "history");

  return (
    <HistorySectionWrapper id="about">
      <Container>
        <Title>{t("history.title")}</Title>
        <HistoryText>{t("history.description")}</HistoryText>
      </Container>
    </HistorySectionWrapper>
  );
};

export default HistorySection;
