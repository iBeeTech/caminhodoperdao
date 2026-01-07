import styled from "styled-components";

export const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  background: #fff;
  color: ${({ theme }) => theme.colors.text};

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.gradientStart};
    outline-offset: 2px;
  }
`;
