import styled, { css } from "styled-components";

export const SignupSectionWrapper = styled.section`
  background: #f5f7fb;
  padding: 80px 0;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 48px 0;
  }
`;

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;

  @media (max-width: 480px) {
    padding: 0 16px;
  }
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
  /* Impede que conteúdo "inquebrável" (ex.: código PIX, e-mails longos)
     estoure a largura no mobile, criando rolagem horizontal. */
  min-width: 0;

  > * {
    min-width: 0;
  }

  @media (max-width: 480px) {
    padding: 20px;
  }
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

  > * {
    min-width: 0;
  }
`;

export const IntentContainer = styled.div`
  display: grid;
  gap: 16px;
  margin-top: 8px;

  > * {
    min-width: 0;
  }
`;

export const IntentTitle = styled.h3`
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const IntentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 14px;
  padding: 20px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;

  strong {
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  span {
    font-size: 0.95rem;
    color: ${({ theme }) => theme.colors.muted};
  }

  &:hover {
    background: #f5f7fb;
  }

  &:active {
    transform: scale(0.99);
  }
`;

export const CancelRegistrationButton = styled.button`
  background: none;
  border: 1px solid #dc2626;
  color: #dc2626;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #dc2626;
    color: #fff;
  }
`;

export const BackButton = styled.button`
  justify-self: start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: underline;
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

  > * {
    min-width: 0;
  }
`;

export const PixLabelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

export const PixLabel = styled.label`
  font-weight: 700;
  margin: 0;
  flex: 1;
`;

export const CopyButton = styled.button`
  padding: 6px 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  
  &:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

export const PixTextarea = styled.textarea`
  width: 100%;
  max-width: 100%;
  min-height: 120px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
  resize: vertical;
  font-family: monospace;
  /* O código PIX é uma string longa sem espaços; força a quebra
     para não estourar a largura no mobile. */
  overflow-wrap: anywhere;
  word-break: break-all;
`;

export const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 12px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const QRCodeImage = styled.img`
  max-width: 200px;
  height: auto;
  border-radius: 6px;
  
  @media (max-width: 640px) {
    max-width: 150px;
  }
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

export const ConfirmationModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const ConfirmationModalDialog = styled.div`
  width: 100%;
  max-width: 620px;
  background: #ffffff;
  border-radius: 16px;
  padding: 28px 22px 24px;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.22);
  border: 1px solid #dbeafe;
  position: relative;
  display: grid;
  gap: 14px;
`;

export const ConfirmationModalClose = styled.button`
  position: absolute;
  top: 10px;
  right: 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
`;

export const ConfirmationModalTitle = styled.h3`
  margin: 0;
  color: #0f172a;
  font-size: 1.3rem;
  text-align: center;
`;

export const ConfirmationModalDescription = styled.p`
  margin: 0;
  color: #1e293b;
  text-align: center;
  line-height: 1.5;
  font-size: 1rem;
`;

export const ConfirmationModalActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  /* Cada botão centralizado em relação à modal. */
  > * {
    width: auto;
  }
`;
