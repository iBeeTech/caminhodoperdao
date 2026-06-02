import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
  overflow-y: auto;
`;

export const Dialog = styled.div`
  width: 100%;
  max-width: 560px;
  margin: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 24px;
  position: relative;

  &:focus,
  &:focus-visible {
    outline: none;
  }

  @media (max-width: 480px) {
    padding: 20px 16px;
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

export const Title = styled.h2`
  margin: 0 8px 8px 0;
  padding-right: 28px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.3rem;
`;

export const Intro = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.error};
  font-weight: 700;
  line-height: 1.4;
  font-size: 0.95rem;
`;

export const List = styled.ul`
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Item = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

export const ItemBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const ItemTitle = styled.span<{ $danger?: boolean }>`
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.text)};
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
`;

export const ItemDesc = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.86rem;
  line-height: 1.35;
`;

export const ItemIcon = styled.span`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

export const WhatsAppButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 18px;
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
  color: #128c7e;
  background: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #f0fdf9;
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 24px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  color: #ffffff;
  background: ${({ theme }) => theme.colors.primary};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;
