import styled from "styled-components";
import { SectionContainer } from "../shared";

export const CtaSectionWrapper = styled.section`
  padding: 100px 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.ctaDark} 0%, #34495e 100%);
  color: #fff;
  text-align: center;
`;

export const Container = styled(SectionContainer)``;

export const CtaContent = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

export const CtaTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
`;

export const CtaDescription = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2.5rem;
  opacity: 0.9;
`;
