import React from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../../../../../hooks/useAnalytics";
import instagramIcon from "../../../../../assets/instagram.png";
import facebookIcon from "../../../../../assets/communication.png";
import whatsappIcon from "../../../../../assets/whatsapp.png";
import {
  Container,
  FooterBottom,
  FooterColumn,
  FooterContent,
  FooterHeading,
  FooterSectionWrapper,
  FooterSocial,
  FooterSocialItem,
  FooterSubheading,
  SocialIcon,
  SocialImage,
  SrOnly,
} from "./FooterSection.styles";

interface FooterSectionProps {
  getNextWhatsappUrl: () => string;
}

const FooterSection: React.FC<FooterSectionProps> = ({ getNextWhatsappUrl }) => {
  const { t } = useTranslation("common");
  const { externalLinkClicked } = useAnalytics();
  const newTabNotice = (t("footer.newTabNotice") as string) || "Abre em nova aba";
  const socialLabel = (name: string) => `${name} (${newTabNotice})`;


  const handleSocialClick = (platform: string, url?: string) => {
    externalLinkClicked(platform);
    if (platform === "whatsapp") {
      const nextUrl = getNextWhatsappUrl();
      window.open(nextUrl, "_blank");
    } else if (url) {
      window.open(url, "_blank");
    }
  };

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
            <p>caminhadadoperdaoassis@gmail.com</p>
            <p>(16) 3017-0571</p>
          </FooterColumn>
          <FooterColumn>
            <FooterSubheading>{t("footer.socialHeading")}</FooterSubheading>
            <FooterSocial>
              <FooterSocialItem>
                <SocialIcon
                  href="https://www.instagram.com/caminhadadoperdaodeassis/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={socialLabel(t("social.instagram") as string)}
                  onClick={() => handleSocialClick("instagram")}
                >
                  <SocialImage src={instagramIcon} alt="" aria-hidden="true" loading="lazy" />
                  <SrOnly>{t("social.instagram")}</SrOnly>
                  <SrOnly>{newTabNotice}</SrOnly>
                </SocialIcon>
              </FooterSocialItem>
              <FooterSocialItem>
                <SocialIcon
                  href="https://www.facebook.com/MosteirodeClaraval"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={socialLabel(t("social.facebook") as string)}
                  onClick={() => handleSocialClick("facebook")}
                >
                  <SocialImage src={facebookIcon} alt="" aria-hidden="true" loading="lazy" />
                  <SrOnly>{t("social.facebook")}</SrOnly>
                  <SrOnly>{newTabNotice}</SrOnly>
                </SocialIcon>
              </FooterSocialItem>
              <FooterSocialItem>
                <SocialIcon
                  href="#"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={socialLabel(t("social.whatsapp") as string)}
                  onClick={e => {
                    e.preventDefault();
                    handleSocialClick("whatsapp");
                  }}
                >
                  <SocialImage src={whatsappIcon} alt="" aria-hidden="true" loading="lazy" />
                  <SrOnly>{t("social.whatsapp")}</SrOnly>
                  <SrOnly>{newTabNotice}</SrOnly>
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
