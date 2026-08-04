import React from "react";
import { theme } from "../../../styles/theme";
import { clearUserToken } from "../../../utils/auth/userSession";
import { useUserSession } from "../../../utils/auth/useUserSession";

/**
 * O canto da conta, no cabeçalho.
 *
 * Deslogado: um botão "Entrar". Logado: a foto do peregrino, que abre
 * "Perfil" e "Sair".
 *
 * ⚠️ A FOTO ainda não existe — não há storage de imagem no projeto (o plano
 * prevê R2, bloco 5). Até lá o avatar é a inicial sobre o dourado da logo, que
 * já cumpre o papel de "esta conta é a minha" sem prometer o que não temos.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: "relative", display: "flex", alignItems: "center" },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: `2px solid ${c.goldDark}`,
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, ${c.gold} 100%)`,
    color: "#4a3105",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    background: "#fff",
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
    minWidth: 220,
    overflow: "hidden",
    zIndex: 1100,
  },
  menuHeader: {
    padding: "12px 14px",
    borderBottom: `1px solid ${c.border}`,
    background: c.background,
  },
  menuEmail: {
    margin: 0,
    fontSize: 12,
    color: c.muted,
    wordBreak: "break-all",
    lineHeight: 1.4,
  },
  item: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "0.7rem 0.9rem",
    color: c.text,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.92rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  itemDanger: { color: "#b91c1c", borderTop: `1px solid ${c.border}` },
  enterLink: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.45rem 0.95rem",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    color: c.text,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "0.92rem",
    whiteSpace: "nowrap",
  },
};

const AccountMenu: React.FC = () => {
  const { isLoggedIn, email } = useUserSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!isLoggedIn) {
    return (
      <a href="/entrar" style={styles.enterLink}>
        Entrar
      </a>
    );
  }

  const initial = (email?.trim()[0] || "P").toUpperCase();

  return (
    <div style={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        style={styles.avatarButton}
        onClick={() => setIsOpen(open => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Minha conta"
        title={email ?? "Minha conta"}
      >
        {initial}
      </button>

      {isOpen && (
        <div style={styles.menu} role="menu">
          <div style={styles.menuHeader}>
            <p style={styles.menuEmail}>{email}</p>
          </div>
          <a href="/perfil" role="menuitem" style={styles.item}>
            Perfil
          </a>
          <button
            type="button"
            role="menuitem"
            style={{ ...styles.item, ...styles.itemDanger }}
            onClick={() => {
              clearUserToken();
              window.location.assign("/");
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
