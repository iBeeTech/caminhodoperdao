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

