import styled, { css } from "styled-components";
import { CalloutVariant } from "./Callout";

const variantStyles: Record<CalloutVariant, ReturnType<typeof css>> = {
  warning: css`
    border-color: #fca5a5;
    background: #fff5f5;
    color: #7f1d1d;
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
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 600;
  line-height: 1.5;
  margin-top: 16px;
  ${({ $variant }) => variantStyles[$variant]};
`;
