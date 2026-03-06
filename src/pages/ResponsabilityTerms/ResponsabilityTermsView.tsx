import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Header } from "../../components";
import logo from "../../assets/logo.png";
import {
  TermsMain,
  TermsPageWrapper,
  TermsTitle,
  TermsSubtitle,
  TermsLogo,
  TermsIntro,
  TermsList,
  TermsSectionTitle,
  TermsParagraph,
} from "./ResponsabilityTerms.styles";

const ResponsabilityTermsView: React.FC = () => {
  const { t } = useTranslation("common");
  const introParagraphs = t("responsibilityTerms.introParagraphs", { returnObjects: true }) as string[];
  const riskItems = t("responsibilityTerms.riskItems", { returnObjects: true }) as string[];
  const declarationParagraphs = t("responsibilityTerms.declarationParagraphs", { returnObjects: true }) as string[];

  return (
    <TermsPageWrapper>
      <Header />
      <TermsMain id="main-content">
        <TermsLogo src={logo} alt={t("responsibilityTerms.logoAlt") as string} />
        <TermsTitle>{t("responsibilityTerms.title")}</TermsTitle>
        <TermsSubtitle>{t("responsibilityTerms.subtitle")}</TermsSubtitle>

        <TermsIntro>
          {introParagraphs.map((_, index) => (
            <TermsParagraph key={index}>
              <Trans i18nKey={`responsibilityTerms.introParagraphs.${index}`} ns="common" components={{ strong: <strong /> }} />
            </TermsParagraph>
          ))}
        </TermsIntro>

        <TermsList>
          {riskItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </TermsList>

        <TermsParagraph>
          <strong>{t("responsibilityTerms.insuranceNotice")}</strong>
        </TermsParagraph>

        <TermsSectionTitle>{t("responsibilityTerms.declarationTitle")}</TermsSectionTitle>
        {declarationParagraphs.map((paragraph, index) => (
          <TermsParagraph key={index}>{paragraph}</TermsParagraph>
        ))}
      </TermsMain>
    </TermsPageWrapper>
  );
};

export default ResponsabilityTermsView;
