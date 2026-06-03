import React from "react";
import { Link, useLocation } from "react-router-dom";

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  justifyContent: "center",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const baseItem: React.CSSProperties = {
  padding: "0.5rem 1.2rem",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  border: "1px solid #d1d5db",
  color: "#374151",
  background: "#fff",
  font: "inherit",
};

const activeItem: React.CSSProperties = {
  ...baseItem,
  background: "#1f7a3d",
  color: "#fff",
  borderColor: "#1f7a3d",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  boxShadow: "0 8px 22px rgba(0,0,0,0.14)",
  overflow: "hidden",
  zIndex: 30,
  minWidth: 190,
};

const menuItem: React.CSSProperties = {
  display: "block",
  padding: "0.7rem 1.1rem",
  textDecoration: "none",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.92rem",
  cursor: "pointer",
};

// Navegação do /admin: planilhas, estornos e um dropdown de tutoriais de cancelamento.
const AdminNav: React.FC = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const tutorialsActive = pathname.startsWith("/tutoriais");

  return (
    <nav style={navStyle} aria-label="Navegação do admin">
      <Link to="/admin" style={pathname === "/admin" ? activeItem : baseItem}>
        Planilhas
      </Link>
      <Link
        to="/admin/estorno"
        style={pathname.startsWith("/admin/estorno") ? activeItem : baseItem}
      >
        Estornos
      </Link>

      <div style={{ position: "relative" }} onMouseLeave={() => setOpen(false)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setOpen(true)}
          aria-haspopup="true"
          aria-expanded={open}
          style={{
            ...(tutorialsActive ? activeItem : baseItem),
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Tutoriais de Cancelamento <span style={{ fontSize: "0.7rem" }}>▾</span>
        </button>

        {open && (
          <div style={menuStyle} role="menu">
            <Link
              to="/tutoriais?tipo=camiseta"
              role="menuitem"
              style={menuItem}
              onClick={() => setOpen(false)}
            >
              Camisetas
            </Link>
            <Link
              to="/tutoriais?tipo=inscricao"
              role="menuitem"
              style={{ ...menuItem, borderTop: "1px solid #f0f0f0" }}
              onClick={() => setOpen(false)}
            >
              Inscrição
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AdminNav;
