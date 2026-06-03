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

// Navegação do /admin: planilhas, estornos e tutoriais de cancelamento.
const AdminNav: React.FC = () => {
  const { pathname } = useLocation();
  const items = [
    { to: "/admin", label: "Planilhas", active: pathname === "/admin" },
    { to: "/admin/estorno", label: "Estornos", active: pathname.startsWith("/admin/estorno") },
    {
      to: "/admin/tutoriais",
      label: "Tutoriais de Cancelamento",
      active: pathname.startsWith("/admin/tutoriais"),
    },
  ];
  return (
    <nav style={navStyle} aria-label="Navegação do admin">
      {items.map((it) => (
        <Link key={it.to} to={it.to} style={it.active ? activeItem : baseItem}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
};

export default AdminNav;
