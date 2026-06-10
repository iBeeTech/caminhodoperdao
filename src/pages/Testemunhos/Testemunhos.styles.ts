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
  min-height: 160px;
  resize: vertical;
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.gradientStart};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.gradientStart}33;
  }
`;

// Alternância entre gravar áudio e escrever.
export const ModeTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 0.35rem;
`;

export const ModeTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 9px;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $active }) => ($active ? "#fff" : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.gradientStart : "#6b7280")};
  box-shadow: ${({ $active }) => ($active ? "0 1px 4px rgba(0,0,0,0.1)" : "none")};
`;

// Caixa da gravação de áudio.
export const RecorderBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 1.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
`;

export const LimitNote = styled.p`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gradientStart};
  text-align: center;
`;

export const Timer = styled.div<{ $warning?: boolean }>`
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $warning }) => ($warning ? "#b91c1c" : "#111827")};
`;

export const RecordButton = styled.button<{ $recording?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  color: #fff;
  background: ${({ $recording }) => ($recording ? "#b91c1c" : "#1f7a3d")};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

export const SecondaryButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.gradientStart};
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
`;

export const AudioPlayer = styled.audio`
  width: 100%;
`;

export const HelperText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.5;
`;

export const ConsentRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
  cursor: pointer;
`;

export const ConsentCheckbox = styled.input`
  margin-top: 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  cursor: pointer;
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

// Lista de testemunhos aprovados, abaixo do formulário.
export const ListSection = styled.section`
  padding: 24px 0 80px;
`;

export const ListContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ListTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  text-align: center;
`;

export const TestimonyCard = styled.article`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
`;

export const TestimonyContent = styled.p`
  margin: 0 0 0.85rem 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.65;
  white-space: pre-wrap;
`;

export const TestimonyMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 600;
`;

export const AudioBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gradientStart};
  background: ${({ theme }) => theme.colors.gradientStart}14;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
`;

export const EmptyState = styled.p`
  text-align: center;
  color: #6b7280;
  padding: 1rem 0;
`;
