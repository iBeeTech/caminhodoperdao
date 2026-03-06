import styled, { css } from "styled-components";
import { CalloutVariant } from "./Callout";

const variantStyles: Record<CalloutVariant, ReturnType<typeof css>> = {
  warning: css`
    border-color: #facc15;
    background: #fef9c3;
    color: #b45309;
    box-shadow: 0 2px 8px rgba(250, 204, 21, 0.15);
  `,
  info: css`
    border-color: #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  `,
  success: css`
    border-color: #bbf7d0;
    background: #ecfdf3;
    color: #166534;
  `,
  error: css`
    border-color: #fecdd3;
    background: #fef2f2;
    color: #991b1b;
  `,
};

export const CalloutWrapper = styled.div<{ $variant: CalloutVariant }>`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  padding: 18px 24px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 700;
  line-height: 1.5;
  margin: 24px auto 16px auto;
  max-width: 480px;
  text-align: center;
  font-size: 1.15rem;
  ${({ $variant }) => variantStyles[$variant]};
`;
