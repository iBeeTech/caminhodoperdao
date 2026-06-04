import styled from "styled-components";

export const Page = styled.div`
  min-height: 100vh;
`;

export const Main = styled.main`
  display: block;
`;

export const FormSection = styled.section`
  padding: 80px 0 40px;
`;

export const FormContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const FormTitle = styled.h1`
  text-align: center;
  font-size: 2.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.75rem 0;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

export const FormSubtitle = styled.p`
  text-align: center;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.85;
  margin: 0 0 2.25rem 0;
  line-height: 1.6;
`;

export const FormCard = styled.form`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

export const Label = styled.label`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const Input = styled.input`
  padding: 0.75rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  font: inherit;
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.gradientStart};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.gradientStart}33;
  }
`;

export const Textarea = styled.textarea`
  padding: 0.75rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  font: inherit;
  min-height: 140px;
  resize: vertical;
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.gradientStart};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.gradientStart}33;
  }
`;

export const StarsRow = styled.div`
  display: flex;
  gap: 0.35rem;
`;

export const StarButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.75rem;
  line-height: 1;
  padding: 0;
  filter: ${({ $active }) => ($active ? "none" : "grayscale(1)")};
  opacity: ${({ $active }) => ($active ? 1 : 0.4)};
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.15);
  }
`;

export const SubmitButton = styled.button`
  align-self: flex-start;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.25s ease;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

export const FeedbackMessage = styled.p<{ $variant: "success" | "error" }>`
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  background: ${({ $variant }) => ($variant === "success" ? "#dcfce7" : "#fee2e2")};
  color: ${({ $variant }) => ($variant === "success" ? "#166534" : "#b91c1c")};
`;

export const FieldError = styled.span`
  color: #b91c1c;
  font-size: 0.85rem;
`;
