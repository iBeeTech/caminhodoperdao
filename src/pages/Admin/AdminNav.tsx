import React from "react";
import { Link, useLocation } from "react-router-dom";
import { isSuperAdmin } from "../../utils/auth/superAdmin";

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const logoutLink: React.CSSProperties = {
  marginLeft: "auto",
  background: "none",
  border: "none",
  color: "#b91c1c",
  fontWeight: 600,
  fontSize: "0.9rem",
  textDecoration: "underline",
  cursor: "pointer",
  font: "inherit",
};

const STORAGE_KEY = "admin_jwt";

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
      <Link
        to="/admin/inscritos"
        style={pathname.startsWith("/admin/inscritos") ? activeItem : baseItem}
      >
        Inscritos
      </Link>
      <Link
        to="/admin/lista-espera"
        style={pathname.startsWith("/admin/lista-espera") ? activeItem : baseItem}
      >
        Lista de espera
      </Link>
      <Link
        to="/admin/pernoiteExtra"
        style={pathname.startsWith("/admin/pernoiteExtra") ? activeItem : baseItem}
      >
        Pernoite extra
      </Link>
      {isSuperAdmin() && (
        <Link
          to="/admin/convites"
          style={pathname.startsWith("/admin/convites") ? activeItem : baseItem}
        >
          Convites
        </Link>
      )}
      <Link
        to="/admin/testemunhos"
        style={pathname.startsWith("/admin/testemunhos") ? activeItem : baseItem}
      >
        Testemunhos
      </Link>
      <Link
        to="/admin/passar-cpf"
        style={pathname.startsWith("/admin/passar-cpf") ? activeItem : baseItem}
      >
        Passar CPF
      </Link>
      <button
        type="button"
        style={logoutLink}
        onClick={() => {
          localStorage.removeItem(STORAGE_KEY);
          window.location.href = "/admin";
        }}
      >
        Sair
      </button>
    </nav>
  );
};

export default AdminNav;
