import React from "react";
import { useTranslation } from "react-i18next";
import instagramIcon from "../../../../../assets/instagram.png";
import facebookIcon from "../../../../../assets/communication.png";
import whatsappIcon from "../../../../../assets/whatsapp.png";
import {
  Container,
  FooterBottom,
  FooterColumn,
  FooterContent,
  FooterHeading,
  FooterLink,
  FooterList,
  FooterListItem,
  FooterSectionWrapper,
  FooterSocial,
  FooterSocialItem,
  FooterSubheading,
  SocialIcon,
  SocialImage,
  SrOnly,
} from "./FooterSection.styles";

const FooterSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <FooterSectionWrapper id="contact">
      <Container>
        <FooterContent>
          <FooterColumn>
            <FooterHeading>{t("footer.heading")}</FooterHeading>
            <p>{t("footer.description")}</p>
          </FooterColumn>
          <FooterColumn>
            <FooterSubheading>{t("footer.contactHeading")}</FooterSubheading>
            <p>{t("footer.email")}</p>
            <p>{t("footer.phone")}</p>
          </FooterColumn>
          <FooterColumn>
            <FooterSubheading>{t("footer.socialHeading")}</FooterSubheading>
            <FooterSocial>
              <FooterSocialItem>
                <SocialIcon href="https://www.instagram.com/caminhadadoperdaodeassis/" target="_blank" rel="noreferrer">
                  <SocialImage src={instagramIcon} alt={t("social.instagram") as string} loading="lazy" />
                  <SrOnly>{t("social.instagram")}</SrOnly>
                </SocialIcon>
              </FooterSocialItem>
              <FooterSocialItem>
                <SocialIcon href="https://www.facebook.com/MosteirodeClaraval" target="_blank" rel="noreferrer">
                  <SocialImage src={facebookIcon} alt={t("social.facebook") as string} loading="lazy" />
                  <SrOnly>{t("social.facebook")}</SrOnly>
                </SocialIcon>
              </FooterSocialItem>
              <FooterSocialItem>
                <SocialIcon href="https://wa.me/5511999999999" target="_blank" rel="noreferrer">
                  <SocialImage src={whatsappIcon} alt={t("social.whatsapp") as string} loading="lazy" />
                  <SrOnly>{t("social.whatsapp")}</SrOnly>
                </SocialIcon>
              </FooterSocialItem>
            </FooterSocial>
          </FooterColumn>
        </FooterContent>
        <FooterBottom>
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </FooterBottom>
      </Container>
    </FooterSectionWrapper>
  );
};

export default FooterSection;
