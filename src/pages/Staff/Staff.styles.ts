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

export const DangerButton = styled(PrimaryButton)`
  background: #c62828;
`;

export const IntentTitle = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  text-align: center;
  color: ${theme.colors.text};
`;

export const IntentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const IntentButton = styled.button`
  display: grid;
  gap: 6px;
  text-align: left;
  background: #fff;
  border: 2px solid ${theme.colors.primary};
  border-radius: 14px;
  padding: 20px;
  cursor: pointer;
  transition: background 0.2s ease;

  strong {
    font-size: 1.1rem;
    color: ${theme.colors.primary};
  }
  span {
    font-size: 0.92rem;
    color: #6b7280;
  }
  &:hover {
    background: #f5f7fb;
  }
`;

export const BackButton = styled.button`
  justify-self: start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${theme.colors.primary};
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: underline;
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
`;

export const ModalDialog = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  max-width: 460px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: ${theme.colors.text};
`;

export const ModalText = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #374151;
`;

export const ModalActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const WhatsappLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #25d366;
  color: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
`;
