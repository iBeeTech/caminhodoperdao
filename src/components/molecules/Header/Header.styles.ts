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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 70px;
  gap: 1rem;

  /* Tablet/mobile mantém o comportamento atual: logo à esquerda e menu hambúrguer à direita. */
  @media (max-width: 1090px) {
    display: flex;
    justify-content: space-between;
  }

  @media (max-width: 768px) {
    padding: 0 15px;
    height: 60px;
  }
`;

export const HeaderLogo = styled.div`
  flex-shrink: 0;
  justify-self: start;

  @media (max-width: 1090px) {
    margin-right: auto;
  }
`;

export const HeaderHomeLink = styled.a`
  text-decoration: none;
  display: inline-flex;
  align-items: center;
`;

export const HeaderTitle = styled.p`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  white-space: nowrap;
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
  display: flex;
  justify-content: center;

  @media (max-width: 1090px) {
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
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1.5rem;
  white-space: nowrap;

  @media (max-width: 1090px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

export const NavItem = styled.li`
  position: relative;
  display: flex;
  align-items: center;
`;

/* Item da galeria que só aparece dentro do menu dropdown no tablet/mobile.
   No desktop a galeria é renderizada à direita via HeaderActions. */
export const MobileNavItem = styled(NavItem)`
  display: none;

  @media (max-width: 1090px) {
    display: flex;
  }
`;

/* Slot à direita da header. Diferente do resto do menu, ele NÃO some no
   celular: é onde mora a conta, e um avatar escondido dentro do hambúrguer
   deixa de responder à pergunta "estou logado?" só de bater o olho. */
export const HeaderActions = styled.div`
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 1090px) {
    margin-left: auto;
    margin-right: 0.6rem;
  }
`;

/* O que dentro do slot da direita é só de desktop (a galeria, que no
   tablet/mobile volta para dentro do menu hambúrguer). */
export const DesktopOnlyAction = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 1090px) {
    display: none;
  }
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
  white-space: nowrap;
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

  @media (max-width: 1090px) {
    display: inline-flex;
  }
`;
