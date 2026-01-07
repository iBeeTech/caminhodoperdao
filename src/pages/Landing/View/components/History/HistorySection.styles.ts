import styled from "styled-components";
import { SectionContainer, SectionTitle } from "../shared";

export const HistorySectionWrapper = styled.section`
  padding: 80px 0 40px;
  background: ${({ theme }) => theme.colors.background};
`;

export const Container = styled(SectionContainer)``;

export const Title = styled(SectionTitle)``;

export const HistoryText = styled.p`
  max-width: 840px;
  margin: 0 auto;
  text-align: center;
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${({ theme }) => theme.colors.muted};
`;
