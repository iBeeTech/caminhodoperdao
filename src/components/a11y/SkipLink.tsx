import React from "react";
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

const SkipLink: React.FC = () => (
  <SkipLinkAnchor href="#main-content">Pular para o conteúdo</SkipLinkAnchor>
);

export default SkipLink;
