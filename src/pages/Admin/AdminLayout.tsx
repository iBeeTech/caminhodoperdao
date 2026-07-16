import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";
import { getAdminEmailFromToken, isSuperAdmin } from "../../utils/auth/superAdmin";
import { clearAdminToken, getAdminToken, subscribeAdminSession } from "../../utils/auth/adminSession";

const SIDEBAR_WIDTH = "260px";
const MOBILE_BREAKPOINT = "900px";

interface NavItem {
  to: string;
  label: string;
  /** Só casa a rota exata; usado no "/admin", que é prefixo de todas as outras. */
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: readonly NavItem[];
  /** Grupo ancorado no rodapé da barra, separado das tarefas do dia a dia. */
  footer?: boolean;
  superAdminOnly?: boolean;
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: "Relatórios",
    items: [{ to: "/admin", label: "Planilhas", exact: true }],
  },
  {
    title: "Inscrições",
    items: [
      { to: "/admin/inscritos", label: "Inscritos" },
      { to: "/admin/lista-espera", label: "Lista de espera" },
      { to: "/admin/estorno", label: "Estornos" },
      { to: "/admin/pernoiteExtra", label: "Pernoite extra" },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { to: "/admin/convidar-grupo", label: "Convidar p/ Grupo WP" },
      { to: "/admin/info-mosteiro", label: "Informar Mosteiro" },
      { to: "/admin/testemunhos", label: "Testemunhos" },
    ],
  },
  {
    title: "Sistema",
    footer: true,
    superAdminOnly: true,
    items: [
      { to: "/admin/convites", label: "Convites" },
      { to: "/admin/passar-cpf", label: "Passar CPF" },
    ],
  },
];

const Shell = styled.div`
  min-height: 100vh;
  background: #f6f6f7;

  @media (min-width: ${MOBILE_BREAKPOINT}) {
    display: grid;
    grid-template-columns: ${SIDEBAR_WIDTH} 1fr;
  }
`;

const Sidebar = styled.nav`
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;

  @media (min-width: ${MOBILE_BREAKPOINT}) {
    border-bottom: none;
    border-right: 1px solid #e5e7eb;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #f1f1f3;
`;

const BrandText = styled.div`
  min-width: 0;
`;

const BrandTitle = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.01em;
`;

const BrandEmail = styled.p`
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LogoutButton = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 4px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #b91c1c;
  text-decoration: underline;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    color: #7f1d1d;
  }

  &:focus-visible {
    outline: 2px solid #b91c1c;
    outline-offset: 2px;
  }
`;

const MenuToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 20px 16px;
  padding: 0.55rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: 2px;
  }

  @media (min-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

const Groups = styled.div<{ $open: boolean }>`
  display: ${props => (props.$open ? "flex" : "none")};
  flex-direction: column;
  flex: 1;
  gap: 22px;
  padding: 4px 12px 20px;

  @media (min-width: ${MOBILE_BREAKPOINT}) {
    display: flex;
    padding: 20px 12px;
  }
`;

const Group = styled.div<{ $footer?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;

  ${props =>
    props.$footer &&
    `
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid #f1f1f3;
  `}
`;

const GroupTitle = styled.p`
  margin: 0 0 6px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
`;

const Item = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 0.5rem 12px;
  border-radius: 8px;
  border-left: 3px solid ${props => (props.$active ? "#1f7a3d" : "transparent")};
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => (props.$active ? "#166534" : "#4b5563")};
  background: ${props => (props.$active ? "#eaf5ee" : "transparent")};

  &:hover {
    background: ${props => (props.$active ? "#eaf5ee" : "#f3f4f6")};
    color: ${props => (props.$active ? "#166534" : "#1d1d1f")};
  }

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: -2px;
  }
`;

const Content = styled.div`
  min-width: 0;
`;

function isItemActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

/**
 * Casca das telas de /admin: barra lateral agrupada + área de conteúdo.
 * Sem sessão (tela de login) renderiza só o conteúdo, sem a navegação.
 */
const AdminLayout: React.FC = () => {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  // Assinar o token (e não só ler) faz a barra aparecer assim que o login
  // grava a sessão, sem depender de um reload.
  const token = React.useSyncExternalStore(subscribeAdminSession, getAdminToken, () => null);
  const adminEmail = token ? getAdminEmailFromToken() : null;

  // Navegar fecha a gaveta do mobile; no desktop o CSS ignora esse estado.
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (!adminEmail) {
    return <Outlet />;
  }

  const groups = NAV_GROUPS.filter(group => !group.superAdminOnly || isSuperAdmin());

  const handleLogout = () => {
    clearAdminToken();
    window.location.href = "/admin";
  };

  return (
    <Shell>
      <Sidebar aria-label="Navegação do admin">
        <Brand>
          <BrandText>
            <BrandTitle>Administração</BrandTitle>
            <BrandEmail title={adminEmail}>{adminEmail}</BrandEmail>
          </BrandText>
          <LogoutButton type="button" onClick={handleLogout}>
            Sair
          </LogoutButton>
        </Brand>

        <MenuToggle
          type="button"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(open => !open)}
        >
          <span aria-hidden="true">☰</span> Menu
        </MenuToggle>

        <Groups $open={isMenuOpen}>
          {groups.map(group => (
            <Group key={group.title} $footer={group.footer}>
              <GroupTitle>{group.title}</GroupTitle>
              {group.items.map(item => {
                const active = isItemActive(item, pathname);
                return (
                  <Item
                    key={item.to}
                    to={item.to}
                    $active={active}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Item>
                );
              })}
            </Group>
          ))}
        </Groups>
      </Sidebar>

      <Content>
        <Outlet />
      </Content>
    </Shell>
  );
};

export default AdminLayout;
