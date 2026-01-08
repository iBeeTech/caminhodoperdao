import styled, { css } from "styled-components";

export const SignupSectionWrapper = styled.section`
  background: #f5f7fb;
  padding: 80px 0;
`;

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const SignupCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
`;

export const SignupHeader = styled.div`
  display: grid;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 1.8rem;
  }
`;

export const SignupBullets = styled.ul`
  color: ${({ theme }) => theme.colors.muted};
  margin-top: 12px;
  padding-left: 18px;
  display: grid;
  gap: 10px;
`;

export const SignupForm = styled.form`
  display: grid;
  gap: 16px;
  margin-top: 8px;
`;

export const InfoNote = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.9rem;
`;

export const MonasteryNote = styled.div`
  color: #c2410c;
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 10px;
`;

export const StatusMessage = styled.div<{ $tone?: string | null }>`
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #92400e;
  animation: slideInAndBounce 0.6s ease-out;

  @keyframes slideInAndBounce {
    0% {
      opacity: 0;
      transform: translateY(-20px);
    }
    70% {
      transform: translateY(5px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  ${({ $tone }) =>
    $tone === "error" &&
    css`
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecdd3;
    `}

  ${({ $tone }) =>
    $tone === "success" &&
    css`
      background: #ecfdf3;
      color: #166534;
      border-color: #bbf7d0;
    `}
`;

export const PixBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: #f9fafb;
  display: grid;
  gap: 12px;
`;

export const PixLabel = styled.label`
  font-weight: 700;
  margin: 0;
`;

export const PixTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
  resize: vertical;
  font-family: monospace;
`;

export const PixActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

export const PaidBox = styled.div`
  margin-top: 16px;
  padding: 14px;
  border-radius: 10px;
  background: #ecfdf3;
  color: #065f46;
  border: 1px solid #a7f3d0;
`;

export const WarningNote = styled.div`
  margin-top: 20px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.9rem;
  font-weight: 700;
  color: #b45309;
`;

export const SignupWarningIcon = styled.span`
  line-height: 1.2;
`;
