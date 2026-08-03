import React from "react";
import { useNavigate } from "react-router-dom";
import { clearUserToken, getUserToken } from "../../../utils/auth/userSession";

/**
 * Perfil do peregrino — ESQUELETO.
 *
 * Existe para fechar o ciclo de entrada: sem uma tela para onde ir, não havia
 * como testar cadastro, confirmação e login de ponta a ponta. O conteúdo de
 * verdade (dados, histórico, medalhas, QR code, troca) vem nos próximos passos
 * do Planning.md.
 */

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: "40px 20px", background: "#f5f3ef" },
  card: {
    maxWidth: 520,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e5e0d8",
    borderRadius: 16,
    padding: 32,
  },
  title: { fontSize: 24, margin: "0 0 8px", color: "#1d1d1f" },
  email: { color: "#4b5563", fontSize: 15, margin: "0 0 24px" },
  soon: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 1.7,
  },
  logout: {
    marginTop: 24,
    padding: "0.6rem 1rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#1d1d1f",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
  },
};

/** Lê o e-mail do payload do token, só para exibição. */
function readEmailFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const padded = `${payload}${"=".repeat((4 - (payload.length % 4)) % 4)}`
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    return (JSON.parse(atob(padded)) as { email?: string }).email ?? null;
  } catch {
    return null;
  }
}

const PeregrinoPerfil: React.FC = () => {
  const navigate = useNavigate();
  const token = getUserToken();

  React.useEffect(() => {
    if (!token) navigate("/entrar", { replace: true });
  }, [token, navigate]);

  if (!token) return null;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Sua conta</h1>
        <p style={s.email}>{readEmailFromToken(token) ?? "Peregrino"}</p>

        <div style={s.soon}>
          Sua conta está criada e o e-mail confirmado. Em breve, aqui você vai:
          <br />
          • ver e editar seus dados
          <br />
          • acompanhar sua caminhada ano a ano
          <br />
          • receber suas medalhas
          <br />
          • apresentar seu QR code no credenciamento
        </div>

        <button
          type="button"
          style={s.logout}
          onClick={() => {
            clearUserToken();
            navigate("/entrar", { replace: true });
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default PeregrinoPerfil;
