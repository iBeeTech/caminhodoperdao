import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <HeaderWrapper>
      <HeaderContainer>
        <HeaderLogo>
          <HeaderTitle>{appTitle}</HeaderTitle>
        </HeaderLogo>

        {showNavigation && (
          <>
            <MenuToggle
              $open={isMenuOpen}
              aria-label={t("header.menuToggle") as string}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(prev => !prev)}
            >
              <span />
              <span />
              <span />
            </MenuToggle>
            <Navigation $open={isMenuOpen}>
              <NavList>
                {navigationItems.map((item, index) => {
                  const LinkComponent = item.isCta ? NavLinkCta : NavLink;
                  return (
                    <NavItem key={index}>
                      <LinkComponent href={item.href} onClick={(event) => handleNavClick(event, item.href)}>
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
