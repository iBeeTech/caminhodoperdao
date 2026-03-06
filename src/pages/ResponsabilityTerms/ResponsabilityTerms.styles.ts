import styled from "styled-components";

export const TermsPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors?.background ?? "#f5f5f5"};
`;

export const TermsMain = styled.main`
  flex: 1;
  padding: 2rem 1rem 3rem;
  max-width: 880px;
  margin: 0 auto;
  width: 100%;
  color: #111;
`;

export const TermsLogo = styled.img`
  display: block;
  width: min(280px, 70%);
  margin: 0 auto 1.25rem;
`;

export const TermsTitle = styled.h1`
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin: 0;
  color: #000;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
`;

export const TermsSubtitle = styled.h2`
  margin: 0.25rem 0 2rem;
  font-size: clamp(1.25rem, 2.3vw, 1.6rem);
  text-align: center;
  color: #000;
  text-transform: uppercase;
`;

export const TermsIntro = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

export const TermsSectionTitle = styled.h3`
  margin: 1.5rem 0 0.75rem;
  font-size: 1.5rem;
  color: #000;
  text-transform: uppercase;
`;

export const TermsParagraph = styled.p`
  margin: 0 0 0.75rem;
  line-height: 1.5;
  font-size: 1rem;
  color: #111;
`;

export const TermsList = styled.ul`
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.55rem;

  li {
    line-height: 1.45;
    color: #111;
  }
`;
