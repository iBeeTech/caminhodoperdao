import styled, { css } from "styled-components";
import { ButtonVariant, ButtonSize } from "./Button";

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth?: boolean;
  $loading?: boolean;
}

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    padding: 10px 14px;
    font-size: ${({ theme }) => theme.fontSizes.sm};
  `,
  md: css`
    padding: 14px 16px;
    font-size: ${({ theme }) => theme.fontSizes.md};
  `,
  lg: css`
    padding: 16px 20px;
    font-size: 1.1rem;
  `,
};

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
    color: #fff;
    border: none;
    box-shadow: 0 10px 24px rgba(102, 126, 234, 0.25);
  `,
  secondary: css`
    background: transparent;
    color: #fff;
    border: 2px solid #fff;
    box-shadow: none;
  `,
  ghost: css`
    background: #fff;
    color: ${({ theme }) => theme.colors.gradientStart};
    border: none;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.error};
    color: #fff;
    border: none;
  `,
  cta: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
    color: #fff;
    border: none;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  `,
};

export const StyledButton = styled.button<StyledButtonProps>`
  border-radius: ${({ $variant, theme }) => ($variant === "secondary" ? theme.radius.pill : theme.radius.md)};
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  border: none;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.gradientStart};
    outline-offset: 3px;
  }

  ${({ $size }) => sizeStyles[$size]};
  ${({ $variant }) => variantStyles[$variant]};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    filter: grayscale(0.1);
  }

  ${({ $variant }) =>
    $variant === "secondary" &&
    css`
      color: #fff;
    `}

  ${({ $variant }) =>
    $variant === "ghost" &&
    css`
      &:hover {
        transform: translateY(-1px);
        box-shadow: ${({ theme }) => theme.shadows.sm};
      }
    `}
`;
