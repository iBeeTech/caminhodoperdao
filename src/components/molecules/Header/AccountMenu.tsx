import React from "react";
import { theme } from "../../../styles/theme";
import { clearUserToken, getUserToken } from "../../../utils/auth/userSession";
import { useUserSession } from "../../../utils/auth/useUserSession";

/**
 * O canto da conta, no cabeçalho.
 *
 * Deslogado: um botão "Entrar". Logado: a foto do peregrino, que abre
 * "Perfil" e "Sair".
 *
 * A foto vem de `/api/me/photo`, que exige token — então não dá para jogá-la
 * num `<img src>` direto. É buscada com `fetch`, virada em blob e guardada em
 * `sessionStorage`: sem isso, toda página do site faria um pedido de imagem só
 * para desenhar um círculo de 40px. Quem não subiu foto continua com a inicial.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: "relative", display: "flex", alignItems: "center" },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    borderRadius: "50%",
  },
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
  // "Entrar | Cadastrar-se" é UM botão com dois destinos, não dois botões: a
  // pessoa que chega não sabe se já tem conta, e duas caixas separadas fazem
  // essa dúvida virar hesitação. O divisor deixa o par visualmente junto.
  authBox: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  authEnter: {
    padding: "0.45rem 0.85rem",
    color: c.text,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  authDivider: { width: 1, alignSelf: "stretch", background: c.border },
  authSignup: {
    padding: "0.45rem 0.9rem",
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    color: "#4a3105",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: "0.9rem",
  },
};

/** Chave do cache da foto na sessão. Exportada para o perfil poder limpá-la
 * assim que a pessoa troca a imagem — senão o avatar do topo só mudaria na
 * próxima aba aberta. */
export const PHOTO_CACHE_KEY = "peregrino_photo";

async function fetchPhotoDataUrl(): Promise<string | null> {
  const token = getUserToken();
  if (!token) return null;
  try {
    const response = await fetch("/api/me/photo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const AccountMenu: React.FC = () => {
  const { isLoggedIn, email } = useUserSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isLoggedIn) {
      setPhotoUrl(null);
      return;
    }
    const cached = sessionStorage.getItem(PHOTO_CACHE_KEY);
    if (cached) {
      // "none" é cache de ausência: sem ele, quem não tem foto refaria o pedido
      // a cada página só para receber 404 de novo.
      setPhotoUrl(cached === "none" ? null : cached);
      return;
    }
    let isActive = true;
    fetchPhotoDataUrl().then(url => {
      if (!isActive) return;
      sessionStorage.setItem(PHOTO_CACHE_KEY, url ?? "none");
      setPhotoUrl(url);
    });
    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

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
      <span style={styles.authBox}>
        <a href="/entrar" style={styles.authEnter}>
          Entrar
        </a>
        <span style={styles.authDivider} aria-hidden="true" />
        {/* `?cadastro=1` abre a mesma tela já no passo de criar conta — quem
            clicou em "Cadastrar-se" não deve cair num formulário de login. */}
        <a href="/entrar?cadastro=1" style={styles.authSignup}>
          Cadastrar-se
        </a>
      </span>
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
        {photoUrl ? (
          <img src={photoUrl} alt="" style={styles.avatarImage} />
        ) : (
          initial
        )}
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
              sessionStorage.removeItem(PHOTO_CACHE_KEY);
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
