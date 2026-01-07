import styled from "styled-components";
import { SectionContainer } from "../shared";

export const FooterSectionWrapper = styled.footer`
  background: ${({ theme }) => theme.colors.text};
  color: #fff;
  padding: 60px 0 20px;
`;

export const Container = styled(SectionContainer)``;

export const FooterContent = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

export const FooterColumn = styled.div``;

export const FooterHeading = styled.h3`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.gradientStart};
`;

export const FooterSubheading = styled.h4`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.gradientStart};
`;

export const FooterList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const FooterListItem = styled.li`
  margin-bottom: 0.5rem;
`;

export const FooterLink = styled.a`
  color: #ecf0f1;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.gradientStart};
  }
`;

export const FooterSocial = styled.ul`
  display: flex;
  gap: 0.6rem;
  justify-content: flex-start;
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const FooterSocialItem = styled.li`
  margin: 0;
`;

export const SocialIcon = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: transparent;
  box-shadow: none;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

export const SocialImage = styled.img`
  width: 30px;
  height: 30px;
  object-fit: contain;
`;

export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const FooterBottom = styled.div`
  border-top: 1px solid #34495e;
  padding-top: 2rem;
  text-align: center;
  color: #bdc3c7;
`;
