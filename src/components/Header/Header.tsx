import React from "react";
import "./Header.css";

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = "Caminho do Perdão",
  showNavigation = true,
}) => {
  const navigationItems = [
    { label: "Início", href: "#home" },
    { label: "Sobre", href: "#about" },
    { label: "Serviços", href: "#services" },
    { label: "Contato", href: "#contact" },
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <h1 className="header-title">{title}</h1>
        </div>

        {showNavigation && (
          <nav className="header-navigation">
            <ul className="nav-list">
              {navigationItems.map((item, index) => (
                <li key={index} className="nav-item">
                  <a href={item.href} className="nav-link">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="header-actions">
          <button className="btn-primary">Entrar</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
