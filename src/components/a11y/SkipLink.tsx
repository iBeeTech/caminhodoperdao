import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const SkipLinkAnchor = styled.a`
  position: absolute;
  left: 16px;
  top: -48px;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.text};
  color: #fff;
  border-radius: ${({ theme }) => theme.radius.sm};
  z-index: 2000;
  text-decoration: none;
  transition: top 0.2s ease, transform 0.2s ease;

  &:focus-visible {
    top: 12px;
    transform: translateY(0);
  }
`;

const SkipLink: React.FC = () => {
  const { t } = useTranslation("common");
  return <SkipLinkAnchor href="#main-content">{t("skipLink")}</SkipLinkAnchor>;
};

export default SkipLink;
