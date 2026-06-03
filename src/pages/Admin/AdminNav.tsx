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
};

const activeItem: React.CSSProperties = {
  ...baseItem,
  background: "#1f7a3d",
  color: "#fff",
  borderColor: "#1f7a3d",
};

// Navegação do /admin: alterna entre as planilhas (/admin) e os estornos (/admin/estorno).
const AdminNav: React.FC = () => {
  const { pathname } = useLocation();
  const isEstorno = pathname.startsWith("/admin/estorno");
  return (
    <nav style={navStyle} aria-label="Navegação do admin">
      <Link to="/admin" style={isEstorno ? baseItem : activeItem}>
        Planilhas
      </Link>
      <Link to="/admin/estorno" style={isEstorno ? activeItem : baseItem}>
        Estornos
      </Link>
    </nav>
  );
};

export default AdminNav;
