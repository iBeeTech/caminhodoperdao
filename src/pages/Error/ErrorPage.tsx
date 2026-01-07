import React from "react";
import { useTranslation } from "react-i18next";
import { BackLink, ErrorCard, ErrorContainer, ErrorMessage, ErrorPageWrapper, ErrorTitle } from "./ErrorPage.styles";

const ErrorPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ErrorPageWrapper>
      <ErrorContainer>
        <ErrorCard>
          <ErrorTitle>{t("errorPage.title")}</ErrorTitle>
          <ErrorMessage>{t("errorPage.message")}</ErrorMessage>
          <BackLink href="/">{t("errorPage.back")}</BackLink>
        </ErrorCard>
      </ErrorContainer>
    </ErrorPageWrapper>
  );
};

export default ErrorPage;
