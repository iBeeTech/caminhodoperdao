import styled from "styled-components";

export const TermsPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors?.background ?? "#f5f5f5"};
`;

export const TermsMain = styled.main`
  flex: 1;
  padding: 2rem 1rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

export const TermsTitle = styled.h1`
  font-size: 1.75rem;
  margin: 0;
  color: ${({ theme }) => theme.colors?.text ?? "#333"};
`;
