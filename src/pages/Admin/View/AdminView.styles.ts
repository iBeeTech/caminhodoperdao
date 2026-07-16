import styled from "styled-components";

export const AdminPage = styled.main`
  min-height: 100vh;
  background: #f6f6f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
`;

export const AdminContainer = styled.div`
  width: min(560px, 100%);
`;

export const AdminCard = styled.section`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;

  input {
    border: 1px solid #d9d9de;
    border-radius: 8px;
    padding: 12px;
    font-size: 16px;
    font-family: inherit;
  }
`;

export const AdminTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  color: #1d1d1f;
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  font-size: 14px;
  color: #4b4b52;
`;

export const ErrorText = styled.p`
  color: #c62828;
  margin: 0;
`;

export const SuccessText = styled.p`
  color: #1b7f3c;
  margin: 0;
`;

export const HelpText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #4b4b52;
`;

/** Link de ação dentro do card (ex.: "Esqueci minha senha"). */
export const LinkButton = styled.button`
  align-self: center;
  background: none;
  border: none;
  padding: 4px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #1f7a3d;
  text-decoration: underline;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    color: #14532d;
  }

  &:disabled {
    color: #9ca3af;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: 2px;
  }
`;

export const InfoBox = styled.div`
  background: #eaf5ee;
  border: 1px solid #bfe0cb;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #14532d;
`;

/** Destaque para segredo mostrado uma única vez (senha temporária). */
export const SecretBox = styled.div`
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #7c2d12;

  code {
    display: inline-block;
    margin-top: 6px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid #fed7aa;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 16px;
    letter-spacing: 0.06em;
    color: #1d1d1f;
    user-select: all;
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  background: #1f6feb;
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
  background: #0f9d58;
`;

export const DangerButton = styled(PrimaryButton)`
  background: #d32f2f;
`;

export const PurpleButton = styled(PrimaryButton)`
  background: #a78bfa;
`;

export const OrangeButton = styled(PrimaryButton)`
  background: #f97316;
`;

export const YellowButton = styled(PrimaryButton)`
  background: #fbbf24;
  color: #1d1d1f;
`;

export const SlateButton = styled(PrimaryButton)`
  background: #475569;
`;

export const ReportLink = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  border: none;
  background: none;
  padding: 4px 0;
  color: #1f6feb;
  font-size: 15px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: #1a5fce;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

