import styled, { css } from "styled-components";

export const HeaderWrapper = styled.header`
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: all 0.3s ease;
`;

export const HeaderContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;

  @media (max-width: 768px) {
    padding: 0 15px;
    height: 60px;
  }
`;

export const HeaderLogo = styled.div`
  flex-shrink: 0;
`;

export const HeaderTitle = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 1.4rem;
  }

  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
`;

export const Navigation = styled.nav<{ $open: boolean }>`
  flex: 1;
  display: flex;
  justify-content: flex-end;

  @media (max-width: 768px) {
    position: absolute;
    top: 60px;
    right: 15px;
    background: #fff;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
    padding: 12px 14px;
    display: ${({ $open }) => ($open ? "block" : "none")};
    min-width: 200px;

    @media (max-width: 480px) {
      top: 56px;
      right: 12px;
    }
  }
`;

export const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

export const NavItem = styled.li`
  position: relative;
`;

export const NavLink = styled.a`
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  font-size: 1rem;
  padding: 0.5rem 0;
  transition: color 0.3s ease;
  position: relative;

  &:hover {
    color: ${({ theme }) => theme.colors.gradientStart};
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
    transition: width 0.3s ease;
  }

  &:hover::after {
    width: 100%;
  }
`;

export const NavLinkCta = styled(NavLink)`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: #fff;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(102, 126, 234, 0.25);
  overflow: hidden;

  &::after {
    display: none;
  }

  &:hover {
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(102, 126, 234, 0.32);
  }
`;

export const MenuToggle = styled.button<{ $open: boolean }>`
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  cursor: pointer;
  padding: 8px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  span {
    display: block;
    height: 2px;
    width: 100%;
    background: ${({ theme }) => theme.colors.text};
    border-radius: 999px;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  ${({ $open }) =>
    $open &&
    css`
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

      span:nth-child(1) {
        transform: translateY(7px) rotate(45deg);
      }

      span:nth-child(2) {
        opacity: 0;
      }

      span:nth-child(3) {
        transform: translateY(-7px) rotate(-45deg);
      }
    `}

  @media (max-width: 768px) {
    display: inline-flex;
  }
`;
