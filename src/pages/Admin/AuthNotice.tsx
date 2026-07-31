import React from "react";
import { Link } from "react-router-dom";

/**
 * Aviso de sessão ausente/expirada das telas do admin.
 *
 * O "Ir para o login" era um link de texto no meio da frase: no celular ninguém
 * percebia que dava para tocar. Virou botão — alvo grande, cor cheia e a frase
 * separada dele — porque essa é a única saída da tela.
 */
const s: Record<string, React.CSSProperties> = {
  text: { color: "#555", margin: "0 0 0.9rem" },
  button: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 52, padding: "0 1.2rem", borderRadius: 12, background: "#1d4ed8",
    color: "#fff", fontWeight: 800, fontSize: "1rem", textDecoration: "none",
    boxShadow: "0 2px 6px rgba(29,78,216,0.35)",
  },
};

interface AuthNoticeProps {
  /** Frase acima do botão. Algumas telas exigem admin geral, não qualquer admin. */
  message?: string;
}

const AuthNotice: React.FC<AuthNoticeProps> = ({
  message = "Você precisa estar logado como admin.",
}) => (
  <>
    <p style={s.text}>{message}</p>
    <Link to="/admin" style={s.button}>
      🔑 Ir para o login
    </Link>
  </>
);

export default AuthNotice;
