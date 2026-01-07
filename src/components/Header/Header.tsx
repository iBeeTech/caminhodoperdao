import React, { useState } from "react";
import "./Header.css";

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = "Caminho do Perdão",
  showNavigation = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  const isGalleryPage = path === "/gallery";
  const navigationItems = isGalleryPage
    ? [
        { label: "Início", href: "/" },
        { label: "Inscrição", href: "/#registration-form" },
        { label: "Cronograma", href: "/#schedule" },
        { label: "Sobre", href: "/#about" },
        { label: "Contato", href: "/#contact" },
        { label: "Galeria de Fotos", href: "/gallery" },
      ]
    : [
        { label: "Início", href: "#home" },
        { label: "Inscrição", href: "#registration-form" },
        { label: "Cronograma", href: "#schedule" },
        { label: "Sobre", href: "#about" },
        { label: "Contato", href: "#contact" },
        { label: "Galeria de Fotos", href: "/gallery" },
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
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <h1 className="header-title">{title}</h1>
        </div>

        {showNavigation && (
          <>
            <button
              className={`menu-toggle ${isMenuOpen ? "open" : ""}`}
              aria-label="Abrir menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(prev => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
            <nav className={`header-navigation ${isMenuOpen ? "open" : ""}`}>
              <ul className="nav-list">
                {navigationItems.map((item, index) => (
                  <li key={index} className="nav-item">
                    <a
                      href={item.href}
                      className={`nav-link ${item.label === "Galeria de Fotos" ? "nav-link-cta" : ""}`.trim()}
                      onClick={(event) => handleNavClick(event, item.href)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
