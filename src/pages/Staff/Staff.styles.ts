import styled from "styled-components";
import { theme } from "../../styles/theme";

export const StaffPage = styled.main`
  min-height: 100vh;
  background: linear-gradient(160deg, ${theme.colors.gradientStart}, ${theme.colors.gradientEnd});
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px 64px;
`;

export const StaffContainer = styled.div`
  width: min(640px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// Faixa de destaque que diferencia claramente a página /staff da home.
export const StaffBanner = styled.div`
  background: #facc15;
  color: #1f2937;
  border-radius: 14px;
  padding: 18px 22px;
  text-align: center;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
`;

export const StaffCard = styled.section`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const StaffTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  color: ${theme.colors.primary};
`;

export const StaffSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #6b7280;
`;

export const SignupForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FieldRow = styled.div`
  display: flex;
  gap: 12px;

  > * {
    flex: 1;
  }

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

export const RadioRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }
`;

export const TermsLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  flex-wrap: wrap;
  font-weight: 600;
  color: #333;

  a {
    color: inherit;
    text-decoration: underline;
    font-weight: 600;
  }
`;

export const ErrorText = styled.p`
  color: #c62828;
  margin: 0;
  font-size: 13px;
`;

export const SuccessBanner = styled.div`
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 600;
`;

export const SuccessText = styled.p`
  color: #1b7f3c;
  margin: 0;
  font-size: 15px;
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  background: ${theme.colors.primary};
  color: #ffffff;
  padding: 14px 18px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled(PrimaryButton)`
  background: #6b7280;
`;
