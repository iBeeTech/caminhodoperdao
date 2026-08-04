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
  MobileNavItem,
  NavLink,
  NavLinkCta,
  HeaderActions,
  DesktopOnlyAction,
  MenuToggle,
} from "./Header.styles";
import AccountMenu from "./AccountMenu";
import { useUserSession } from "../../../utils/auth/useUserSession";

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

const tutMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  zIndex: 50,
  minWidth: 180,
  overflow: "hidden",
};

const tutItemStyle: React.CSSProperties = {
  display: "block",
  padding: "0.6rem 1rem",
  color: "#374151",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const Header: React.FC<HeaderProps> = ({
  title,
  showNavigation = true,
}) => {
  const { t } = useTranslation("common");
  const { navigationLinkClicked, navigationMenuToggled } = useAnalytics();
  const { isLoggedIn } = useUserSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tutOpen, setTutOpen] = useState(false);
  const navigationId = "primary-navigation";
  const navigationLabel = t("header.navigationLabel", { defaultValue: "Navegação principal" }) as string;
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  // Na home as âncoras são locais (#secao); em qualquer outra página (galeria,
  // depoimentos, etc.) elas precisam apontar para a home (/#secao).
  const isHomePage = path === "/";
  const anchorBase = isHomePage ? "" : "/";
  const appTitle = title ?? (t("app.title") as string);
  // "Inscrição" saiu da lista junto com a seção de inscrição da home: a
  // inscrição passa a acontecer dentro da conta, e um item de menu apontando
  // para uma âncora que não existe mais é um clique que não faz nada.
  const navigationItems = [
    { label: t("nav.home"), href: isHomePage ? "#home" : "/" },
    // Só para quem está logado — é o atalho de volta para a caminhada dele.
    ...(isLoggedIn ? [{ label: "Dashboard", href: "/dashboard" }] : []),
    { label: t("nav.schedule"), href: `${anchorBase}#schedule` },
    { label: t("nav.about"), href: `${anchorBase}#about` },
    { label: t("nav.contact"), href: `${anchorBase}#contact` },
    { label: "Medalhas", href: "/medalhas" },
    { label: t("nav.testimonials"), href: "/depoimentos" },
    { label: t("nav.testimonies"), href: "/testemunhos" },
    { label: t("nav.gallery"), href: "/gallery", isCta: true },
  ];

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string, label: string) => {
    const currentPage = typeof window !== "undefined" ? (window.location.pathname === "/gallery" ? "gallery" : "landing") : "landing";
    navigationLinkClicked(currentPage, label, href, "header");
    if (href.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && isMenuOpen) {
      setIsMenuOpen(false);
    }
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
                {navigationItems
                  .filter((item) => !item.isCta)
                  .map((item, index) => (
                    <NavItem key={`n-${index}`}>
                      <NavLink href={item.href} onClick={(event) => handleNavClick(event, item.href, item.label)}>
                        {item.label}
                      </NavLink>
                    </NavItem>
                  ))}

                <NavItem style={{ position: "relative" }} onMouseLeave={() => setTutOpen(false)}>
                  <NavLink
                    as="button"
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={tutOpen}
                    onClick={() => setTutOpen((o) => !o)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Tutoriais <span style={{ fontSize: "0.7rem" }}>▾</span>
                  </NavLink>
                  {tutOpen && (
                    <div style={tutMenuStyle} role="menu">
                      <a
                        href="/tutoriais?tipo=camiseta"
                        role="menuitem"
                        style={tutItemStyle}
                        onClick={() => {
                          navigationLinkClicked("landing", "Tutoriais - Camisetas", "/tutoriais?tipo=camiseta", "header");
                          setTutOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        Camisetas
                      </a>
                      <a
                        href="/tutoriais?tipo=inscricao"
                        role="menuitem"
                        style={{ ...tutItemStyle, borderTop: "1px solid #f0f0f0" }}
                        onClick={() => {
                          navigationLinkClicked("landing", "Tutoriais - Inscrição", "/tutoriais?tipo=inscricao", "header");
                          setTutOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        Inscrição
                      </a>
                    </div>
                  )}
                </NavItem>

                {navigationItems
                  .filter((item) => item.isCta)
                  .map((item, index) => (
                    <MobileNavItem key={`c-${index}`}>
                      <NavLinkCta href={item.href} onClick={(event) => handleNavClick(event, item.href, item.label)}>
                        {item.label}
                      </NavLinkCta>
                    </MobileNavItem>
                  ))}
              </NavList>
            </Navigation>
            <HeaderActions>
              <DesktopOnlyAction>
                {navigationItems
                  .filter((item) => item.isCta)
                  .map((item, index) => (
                    <NavLinkCta
                      key={`cta-${index}`}
                      href={item.href}
                      onClick={(event) => handleNavClick(event, item.href, item.label)}
                    >
                      {item.label}
                    </NavLinkCta>
                  ))}
              </DesktopOnlyAction>
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
                const newState = !isMenuOpen;
                setIsMenuOpen(newState);
                navigationMenuToggled(newState ? "open" : "close", "mobile_menu");
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
