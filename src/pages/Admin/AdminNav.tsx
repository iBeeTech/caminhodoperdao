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

// Navegação do /admin: planilhas e estornos.
const AdminNav: React.FC = () => {
  const { pathname } = useLocation();
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
    </nav>
  );
};

export default AdminNav;
