import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../../../hooks/useAnalytics";
import {
  HeaderWrapper,
  HeaderContainer,
  HeaderLogo,
  HeaderTitle,
  Navigation,
  NavList,
  NavItem,
  NavLink,
  NavLinkCta,
  MenuToggle,
} from "./Header.styles";

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showNavigation = true,
}) => {
  const { t } = useTranslation("common");
  const { navigationLinkClicked, navigationMenuToggled } = useAnalytics();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigationId = "primary-navigation";
  const navigationLabel = t("header.navigationLabel", { defaultValue: "Navegação principal" }) as string;
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  const isGalleryPage = path === "/gallery";
  const appTitle = title ?? (t("app.title") as string);
  const navigationItems = isGalleryPage
    ? [
        { label: t("nav.home"), href: "/" },
        { label: t("nav.registration"), href: "/#registration-form" },
        { label: t("nav.schedule"), href: "/#schedule" },
        { label: t("nav.about"), href: "/#about" },
        { label: t("nav.contact"), href: "/#contact" },
        { label: t("nav.gallery"), href: "/gallery", isCta: true },
      ]
    : [
        { label: t("nav.home"), href: "#home" },
        { label: t("nav.registration"), href: "#registration-form" },
        { label: t("nav.schedule"), href: "#schedule" },
        { label: t("nav.about"), href: "#about" },
        { label: t("nav.contact"), href: "#contact" },
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
          <HeaderTitle aria-label={appTitle}>{appTitle}</HeaderTitle>
        </HeaderLogo>

        {showNavigation && (
          <>
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
            <Navigation $open={isMenuOpen} aria-label={navigationLabel} id={navigationId}>
              <NavList>
                {navigationItems.map((item, index) => {
                  const LinkComponent = item.isCta ? NavLinkCta : NavLink;
                  return (
                    <NavItem key={index}>
                      <LinkComponent href={item.href} onClick={(event) => handleNavClick(event, item.href, item.label)}>
                        {item.label}
                      </LinkComponent>
                    </NavItem>
                  );
                })}
              </NavList>
            </Navigation>
          </>
        )}
      </HeaderContainer>
    </HeaderWrapper>
  );
};

export default Header;
