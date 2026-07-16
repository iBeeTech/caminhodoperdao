import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  getAdminEmailFromToken,
  isPasswordChangePending,
  isSuperAdmin,
} from "../../utils/auth/superAdmin";
import { clearAdminToken, getAdminToken, subscribeAdminSession } from "../../utils/auth/adminSession";

// Abaixo disso vira menu sanduíche; daqui pra cima, navbar com dropdowns.
const MOBILE_BREAKPOINT = "768px";
const DRAWER_WIDTH = "270px";

interface NavItem {
  to: string;
  label: string;
  /** Só casa a rota exata; usado no "/admin", que é prefixo de todas as outras. */
  exact?: boolean;
}

interface NavEntry {
  label: string;
  /** Link direto na barra (sem dropdown). Exclusivo com items. */
  to?: string;
  exact?: boolean;
  /** Abre em dropdown no hover/clique. Exclusivo com to. */
  items?: readonly NavItem[];
  superAdminOnly?: boolean;
}

const NAV: readonly NavEntry[] = [
  {
    label: "Inscrições",
    items: [
      { to: "/admin/inscritos", label: "Inscritos" },
      { to: "/admin/lista-espera", label: "Lista de espera" },
      { to: "/admin/estorno", label: "Estornos" },
      { to: "/admin/pernoiteExtra", label: "Pernoite extra" },
      { to: "/admin", label: "Planilhas", exact: true },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { to: "/admin/convidar-grupo", label: "Convidar p/ Grupo WP" },
      { to: "/admin/info-mosteiro", label: "Informar Mosteiro" },
      { to: "/admin/testemunhos", label: "Testemunhos" },
    ],
  },
  {
    label: "Sistema",
    superAdminOnly: true,
    items: [
      { to: "/admin/pedidos-senha", label: "Pedidos de senha" },
      { to: "/admin/convites", label: "Convites" },
      { to: "/admin/passar-cpf", label: "Passar CPF" },
    ],
  },
];

const Shell = styled.div`
  min-height: 100vh;
  background: #f6f6f7;
`;

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  min-height: 60px;
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex-shrink: 0;
`;

const BrandTitle = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.01em;
  white-space: nowrap;
`;

const BrandEmail = styled.p`
  margin: 1px 0 0;
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 190px;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

/** Navbar (tablet/desktop). No mobile some em favor da gaveta. */
const Menubar = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

const Slot = styled.div`
  position: relative;
`;

const triggerLook = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4b5563;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
`;

const Trigger = styled.button<{ $active: boolean; $open: boolean }>`
  ${triggerLook}
  color: ${props => (props.$active ? "#166534" : "#4b5563")};
  background: ${props => (props.$active || props.$open ? "#eaf5ee" : "transparent")};

  &:hover {
    background: #eaf5ee;
    color: #166534;
  }

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: -2px;
  }
`;

const TopLink = styled(Link)<{ $active: boolean }>`
  ${triggerLook}
  color: ${props => (props.$active ? "#166534" : "#4b5563")};
  background: ${props => (props.$active ? "#eaf5ee" : "transparent")};

  &:hover {
    background: #eaf5ee;
    color: #166534;
  }

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: -2px;
  }
`;

const Caret = styled.span<{ $open: boolean }>`
  font-size: 0.6rem;
  line-height: 1;
  color: #9ca3af;
  transform: rotate(${props => (props.$open ? "180deg" : "0deg")});
  transition: transform 120ms ease;
`;

/** Alfinete: marca visualmente um dropdown fixado por clique. */
const Pin = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1f7a3d;
`;

const DROPDOWN_GAP = "6px";

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + ${DROPDOWN_GAP});
  left: 0;
  min-width: 230px;

  /* Ponte invisível sobre o respiro entre o gatilho e o menu. Sem ela o vão é
     página: descer o mouse até os itens tira o cursor do grupo, dispara o
     mouseleave e o dropdown fecha antes de dar para clicar. O ::before conta
     como o próprio dropdown no hit-test, então o caminho fica contínuo. */
  &::before {
    content: "";
    position: absolute;
    top: -${DROPDOWN_GAP};
    left: 0;
    right: 0;
    height: ${DROPDOWN_GAP};
  }
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.13);
  padding: 6px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DropItem = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 0.5rem 0.7rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  color: ${props => (props.$active ? "#166534" : "#4b5563")};
  background: ${props => (props.$active ? "#eaf5ee" : "transparent")};
  white-space: nowrap;

  &:hover {
    background: ${props => (props.$active ? "#eaf5ee" : "#f3f4f6")};
    color: ${props => (props.$active ? "#166534" : "#1d1d1f")};
  }

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: -2px;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const LogoutButton = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 6px;
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

/** Botão sanduíche: só no mobile. */
const Burger = styled.button`
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  color: #374151;

  &:focus-visible {
    outline: 2px solid #1f7a3d;
    outline-offset: 2px;
  }

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: inline-flex;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 60;

  @media (min-width: calc(${MOBILE_BREAKPOINT} + 1px)) {
    display: none;
  }
`;

const Drawer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${DRAWER_WIDTH};
  max-width: 85vw;
  background: #fff;
  z-index: 70;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 12px;
  gap: 18px;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.16);
`;

const DrawerHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px 12px;
  border-bottom: 1px solid #f1f1f3;
`;

const DrawerGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const GroupTitle = styled.p`
  margin: 0 0 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
`;

const DrawerItem = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 0.55rem 8px;
  border-radius: 8px;
  border-left: 3px solid ${props => (props.$active ? "#1f7a3d" : "transparent")};
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  color: ${props => (props.$active ? "#166534" : "#4b5563")};
  background: ${props => (props.$active ? "#eaf5ee" : "transparent")};

  &:hover {
    background: ${props => (props.$active ? "#eaf5ee" : "#f3f4f6")};
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

function isEntryActive(entry: NavEntry, pathname: string): boolean {
  if (entry.items) return entry.items.some(item => isItemActive(item, pathname));
  return entry.exact ? pathname === entry.to : pathname.startsWith(entry.to ?? "");
}

/**
 * Casca das telas de /admin.
 * Tablet/desktop: navbar cujos grupos abrem em dropdown no hover; clicar no
 * grupo fixa o dropdown (sai só com novo clique, clique fora ou Esc).
 * Mobile: menu sanduíche em gaveta lateral.
 * Sem sessão (tela de login) renderiza só o conteúdo, sem navegação.
 */
const AdminLayout: React.FC = () => {
  const { pathname } = useLocation();
  // openLabel: dropdown visível (por hover ou clique). pinnedLabel: fixado por
  // clique — imune ao mouseleave.
  const [openLabel, setOpenLabel] = React.useState<string | null>(null);
  const [pinnedLabel, setPinnedLabel] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const menubarRef = React.useRef<HTMLElement>(null);

  // Assinar o token (e não só ler) faz a barra aparecer assim que o login
  // grava a sessão, sem depender de um reload.
  const token = React.useSyncExternalStore(subscribeAdminSession, getAdminToken, () => null);
  // Token de troca pendente não conta como sessão: o painel inteiro daria 403,
  // então mostrar o menu só convidaria a cliques que falham.
  const adminEmail = token && !isPasswordChangePending() ? getAdminEmailFromToken() : null;

  const closeMenus = React.useCallback(() => {
    setOpenLabel(null);
    setPinnedLabel(null);
  }, []);

  // Navegar fecha tudo: dropdown fixado e gaveta.
  React.useEffect(() => {
    closeMenus();
    setIsDrawerOpen(false);
  }, [pathname, closeMenus]);

  // Um dropdown fixado só sai com clique fora ou Esc — o mouseleave não o fecha.
  React.useEffect(() => {
    if (!pinnedLabel && !isDrawerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menubarRef.current && !menubarRef.current.contains(event.target as Node)) {
        closeMenus();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
        setIsDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinnedLabel, isDrawerOpen, closeMenus]);

  const entries = NAV.filter(entry => !entry.superAdminOnly || isSuperAdmin());

  const handleLogout = () => {
    clearAdminToken();
    window.location.href = "/admin";
  };

  const handleTriggerClick = (label: string) => {
    // Clicar de novo no grupo fixado solta o alfinete e fecha.
    if (pinnedLabel === label) {
      closeMenus();
      return;
    }
    setPinnedLabel(label);
    setOpenLabel(label);
  };

  const handleSlotLeave = (label: string) => {
    // Sem alfinete, sair de cima fecha. Com alfinete, permanece.
    if (pinnedLabel !== label) {
      setOpenLabel(current => (current === label ? null : current));
    }
  };

  // Sem sessão (login / troca de senha) a barra some, mas a árvore em volta do
  // <Outlet /> mantém SEMPRE a mesma forma e a mesma posição entre irmãos.
  // Trocar a forma remontaria a página filha ao logar, e ela perderia o estado
  // — foi assim que a troca obrigatória entrou em loop: remontava, revalidava
  // a sessão e deslogava, sem nunca deixar trocar a senha.
  return (
    <Shell>
      {adminEmail && (
      <Bar>
        <Burger
          type="button"
          aria-label="Abrir menu"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </Burger>

        <Brand>
          <BrandTitle>Administração</BrandTitle>
          <BrandEmail title={adminEmail}>{adminEmail}</BrandEmail>
        </Brand>

        <Menubar ref={menubarRef} aria-label="Navegação do admin">
          {entries.map(entry => {
            const active = isEntryActive(entry, pathname);

            if (!entry.items) {
              return (
                <TopLink
                  key={entry.label}
                  to={entry.to as string}
                  $active={active}
                  aria-current={active ? "page" : undefined}
                >
                  {entry.label}
                </TopLink>
              );
            }

            const isOpen = openLabel === entry.label;
            const isPinned = pinnedLabel === entry.label;

            return (
              <Slot
                key={entry.label}
                onMouseEnter={() => setOpenLabel(entry.label)}
                onMouseLeave={() => handleSlotLeave(entry.label)}
              >
                <Trigger
                  type="button"
                  $active={active}
                  $open={isOpen}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => handleTriggerClick(entry.label)}
                >
                  {entry.label}
                  {isPinned ? <Pin aria-hidden="true" /> : <Caret $open={isOpen} aria-hidden="true">▾</Caret>}
                </Trigger>

                {isOpen && (
                  <Dropdown>
                    {entry.items.map(item => {
                      const itemActive = isItemActive(item, pathname);
                      return (
                        <DropItem
                          key={item.to}
                          to={item.to}
                          $active={itemActive}
                          aria-current={itemActive ? "page" : undefined}
                        >
                          {item.label}
                        </DropItem>
                      );
                    })}
                  </Dropdown>
                )}
              </Slot>
            );
          })}
        </Menubar>

        <Spacer />

        <LogoutButton type="button" onClick={handleLogout}>
          Sair
        </LogoutButton>
      </Bar>
      )}

      {adminEmail && isDrawerOpen && (
        <>
          <Backdrop onClick={() => setIsDrawerOpen(false)} />
          <Drawer aria-label="Menu do admin">
            <DrawerHead>
              <BrandTitle>Administração</BrandTitle>
              <LogoutButton
                type="button"
                aria-label="Fechar menu"
                onClick={() => setIsDrawerOpen(false)}
                style={{ color: "#6b7280", textDecoration: "none", fontSize: "1.2rem" }}
              >
                <span aria-hidden="true">✕</span>
              </LogoutButton>
            </DrawerHead>

            {entries.map(entry => (
              <DrawerGroup key={entry.label}>
                {entry.items ? (
                  <>
                    <GroupTitle>{entry.label}</GroupTitle>
                    {entry.items.map(item => {
                      const itemActive = isItemActive(item, pathname);
                      return (
                        <DrawerItem
                          key={item.to}
                          to={item.to}
                          $active={itemActive}
                          aria-current={itemActive ? "page" : undefined}
                        >
                          {item.label}
                        </DrawerItem>
                      );
                    })}
                  </>
                ) : (
                  <DrawerItem
                    to={entry.to as string}
                    $active={isEntryActive(entry, pathname)}
                    aria-current={isEntryActive(entry, pathname) ? "page" : undefined}
                  >
                    {entry.label}
                  </DrawerItem>
                )}
              </DrawerGroup>
            ))}
          </Drawer>
        </>
      )}

      <Content>
        <Outlet />
      </Content>
    </Shell>
  );
};

export default AdminLayout;
