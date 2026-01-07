import styled from "styled-components";

export const ErrorPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: #fff;
  padding: 0 20px;
`;

export const ErrorContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

export const ErrorCard = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
`;

export const ErrorTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 12px;
`;

export const ErrorMessage = styled.p`
  font-size: 1.1rem;
  margin-bottom: 24px;
`;

export const BackLink = styled.a`
  background: #fff;
  color: ${({ theme }) => theme.colors.gradientStart};
  padding: 12px 18px;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;
