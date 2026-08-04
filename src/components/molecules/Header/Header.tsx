import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../../../hooks/useAnalytics";
import {
  HeaderWrapper,
  HeaderContainer,
  HeaderLogo,
  HeaderHomeLink,
  HeaderTitle,
  Navigation,
  NavList,
  NavItem,
  NavLink,
  HeaderActions,
  MenuToggle,
} from "./Header.styles";
import AccountMenu from "./AccountMenu";
import { useUserSession } from "../../../utils/auth/useUserSession";

/**
 * Cabeçalho do site.
 *
 * Os itens são AGRUPADOS por assunto, não listados um a um. Com Início,
 * Cronograma, Sobre, Contato, Depoimentos, Testemunhos, Galeria, Medalhas,
 * Tutoriais e Dashboard soltos lado a lado, a barra virava uma parede de texto
 * que não cabia em tela nenhuma:
 *
 * - **Home** — as seções da página inicial (âncoras).
 * - **Memórias** — o que ficou registrado das caminhadas: depoimentos,
 *   testemunhos e fotos.
 * - **Conquistas** — o catálogo de medalhas, aberto a quem não tem conta.
 * - **Meu Caminho** — só para quem está logado.
 *
 * O grupo abre no PASSAR DO MOUSE e só FIXA no clique. Quem está de passagem vê
 * o conteúdo sem clicar; quem quer ler com calma clica e o menu para de sumir
 * quando o mouse escapa. No celular, onde não existe "passar o mouse", o toque
 * conta como clique e abre do mesmo jeito.
 *
 * "Inscrição" saiu junto com a seção de inscrição da home (a inscrição passa a
 * acontecer dentro da conta) e "Tutoriais" foi removido: os passo a passo de
 * cancelamento não valem mais.
 */

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

interface NavLeaf {
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  href?: string;
  items?: NavLeaf[];
}

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
  zIndex: 1050,
  minWidth: 200,
  overflow: "hidden",
  padding: 0,
  margin: 0,
  listStyle: "none",
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "0.6rem 1rem",
  color: "#374151",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
};

const triggerStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const Header: React.FC<HeaderProps> = ({ title, showNavigation = true }) => {
  const { t } = useTranslation("common");
  const { navigationLinkClicked, navigationMenuToggled } = useAnalytics();
  const { isLoggedIn } = useUserSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Dois estados, não um: `openGroup` é o que está visível agora (pode ter sido
  // só o mouse passando), `pinnedGroup` é o que a pessoa fixou no clique. Com um
  // estado só, tirar o mouse fecharia o que ela acabou de fixar.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);

  const navigationId = "primary-navigation";
  const navigationLabel = t("header.navigationLabel", {
    defaultValue: "Navegação principal",
  }) as string;
  const path =
    typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  // Na home as âncoras são locais (#secao); em qualquer outra página elas
  // precisam apontar para a home (/#secao).
  const isHomePage = path === "/";
  const anchorBase = isHomePage ? "" : "/";
  const appTitle = title ?? (t("app.title") as string);

  const groups: NavGroup[] = [
    {
      label: "Home",
      items: [
        { label: t("nav.home") as string, href: isHomePage ? "#home" : "/" },
        { label: t("nav.schedule") as string, href: `${anchorBase}#schedule` },
        { label: t("nav.about") as string, href: `${anchorBase}#about` },
        { label: t("nav.contact") as string, href: `${anchorBase}#contact` },
      ],
    },
    {
      label: "Memórias",
      items: [
        { label: t("nav.testimonials") as string, href: "/depoimentos" },
        { label: t("nav.testimonies") as string, href: "/testemunhos" },
        { label: t("nav.gallery") as string, href: "/gallery" },
      ],
    },
    { label: "Conquistas", href: "/medalhas" },
    // "Meu Caminho" no lugar de "Dashboard": a palavra descreve o que a pessoa
    // vai encontrar (a caminhada dela, ano a ano) em vez do tipo de tela.
    ...(isLoggedIn ? [{ label: "Meu Caminho", href: "/dashboard" }] : []),
  ];

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    label: string
  ) => {
    const currentPage =
      typeof window !== "undefined"
        ? window.location.pathname === "/gallery"
          ? "gallery"
          : "landing"
        : "landing";
    navigationLinkClicked(currentPage, label, href, "header");
    if (href.startsWith("#")) {
      event.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
    setOpenGroup(null);
    setPinnedGroup(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    if (openGroup) {
      setOpenGroup(null);
      setPinnedGroup(null);
    } else if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const openOnHover = (label: string) => {
    if (!pinnedGroup) setOpenGroup(label);
  };

  const closeOnLeave = (label: string) => {
    // Menu fixado ignora a saída do mouse: foi exatamente para isso que a
    // pessoa clicou.
    if (pinnedGroup === label) return;
    setOpenGroup(current => (current === label ? null : current));
  };

  const togglePin = (label: string) => {
    if (pinnedGroup === label) {
      setPinnedGroup(null);
      setOpenGroup(null);
      return;
    }
    setPinnedGroup(label);
    setOpenGroup(label);
  };

  return (
    <HeaderWrapper onKeyDown={handleKeyDown}>
      <HeaderContainer>
        <HeaderLogo>
          <HeaderHomeLink href="/" aria-label={t("nav.home") as string}>
            <HeaderTitle aria-label={appTitle}>{appTitle}</HeaderTitle>
          </HeaderHomeLink>
        </HeaderLogo>

        {showNavigation && (
          <>
            <Navigation $open={isMenuOpen} aria-label={navigationLabel} id={navigationId}>
              <NavList>
                {groups.map(group =>
                  group.items ? (
                    <NavItem
                      key={group.label}
                      style={{ position: "relative" }}
                      onMouseEnter={() => openOnHover(group.label)}
                      onMouseLeave={() => closeOnLeave(group.label)}
                    >
                      <NavLink
                        as="button"
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={openGroup === group.label}
                        onClick={() => togglePin(group.label)}
                        style={triggerStyle}
                      >
                        {group.label} <span style={{ fontSize: "0.7rem" }}>▾</span>
                      </NavLink>

                      {openGroup === group.label && (
                        <ul style={menuStyle} role="menu">
                          {group.items.map((item, index) => (
                            <li key={item.href} role="none">
                              <a
                                href={item.href}
                                role="menuitem"
                                style={
                                  index === 0
                                    ? menuItemStyle
                                    : { ...menuItemStyle, borderTop: "1px solid #f3f4f6" }
                                }
                                onClick={event => handleNavClick(event, item.href, item.label)}
                              >
                                {item.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </NavItem>
                  ) : (
                    <NavItem key={group.label}>
                      <NavLink
                        href={group.href}
                        onClick={event => handleNavClick(event, group.href as string, group.label)}
                      >
                        {group.label}
                      </NavLink>
                    </NavItem>
                  )
                )}
              </NavList>
            </Navigation>

            <HeaderActions>
              <AccountMenu />
            </HeaderActions>

            {/* Depois do avatar no DOM de propósito: no celular a ordem é
                logo → conta → hambúrguer, que é onde o polegar espera cada um. */}
            <MenuToggle
              $open={isMenuOpen}
              aria-label={t("header.menuToggle") as string}
              aria-expanded={isMenuOpen}
              aria-controls={navigationId}
              onClick={() => {
                const nextState = !isMenuOpen;
                setIsMenuOpen(nextState);
                setOpenGroup(null);
                setPinnedGroup(null);
                navigationMenuToggled(nextState ? "open" : "close", "mobile_menu");
              }}
            >
              <span />
              <span />
              <span />
            </MenuToggle>
          </>
        )}
      </HeaderContainer>
    </HeaderWrapper>
  );
};

export default Header;
