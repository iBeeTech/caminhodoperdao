import styled from "styled-components";
import { SectionContainer, SectionTitle } from "../shared";

export const FeaturesSectionWrapper = styled.section`
  padding: 100px 0;
  background: ${({ theme }) => theme.colors.background};
`;

export const Container = styled(SectionContainer)``;

export const Title = styled(SectionTitle)``;

export const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
`;

export const FeatureCard = styled.div`
  background: #fff;
  padding: 1.6rem;
  border-radius: 18px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid ${({ theme }) => theme.colors.border};
  max-width: 260px;
  margin: 0 auto;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.12);
    border-color: #e0e7ff;
  }
`;

export const FeatureIcon = styled.img`
  height: 96px;
  width: 96px;
  object-fit: contain;
  margin: 0 auto 1.5rem auto;
  display: block;
`;

export const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const FeatureDescription = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: #6c757d;
`;
