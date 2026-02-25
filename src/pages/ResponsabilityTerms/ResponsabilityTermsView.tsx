import React from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../../components";
import { TermsMain, TermsPageWrapper, TermsTitle } from "./ResponsabilityTerms.styles";

const ResponsabilityTermsView: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <TermsPageWrapper>
      <Header />
      <TermsMain id="main-content">
        <TermsTitle>{t("responsibilityTerms.title")}</TermsTitle>
      </TermsMain>
    </TermsPageWrapper>
  );
};

export default ResponsabilityTermsView;
