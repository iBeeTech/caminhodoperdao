import { theme } from "../../styles/theme";

/**
 * Estilos compartilhados da área do peregrino.
 *
 * Vive fora das páginas porque `/entrar` e `/perfil` são a mesma experiência
 * visual: se cada uma trouxesse a sua cópia, elas divergiriam no primeiro
 * ajuste. As cores saem do tema (azul #1d2c5e) mais o dourado da logo.
 *
 * O dourado é DESTAQUE, nunca área grande: em bloco largo ele vira aviso de
 * trânsito e come o contraste do texto escuro. Fundo é o degradê azul; o ouro
 * fica em medalha, foco e chamada.
 */
const c = theme.colors;

export const peregrinoStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "40px 20px",
    background: `linear-gradient(160deg, ${c.gradientStart} 0%, ${c.gradientEnd} 100%)`,
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    background: `linear-gradient(160deg, ${c.gradientStart} 0%, ${c.gradientEnd} 100%)`,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    background: c.surface,
    borderRadius: theme.radius.lg,
    padding: 32,
    boxShadow: theme.shadows.md,
    boxSizing: "border-box",
  },
  logo: { display: "block", width: 88, margin: "0 auto 20px" },
  title: {
    fontSize: 24,
    margin: "0 0 8px",
    color: c.primary,
    textAlign: "center",
  },
  help: {
    margin: "0 0 24px",
    color: c.muted,
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "center",
  },
  field: { marginBottom: 16 },
  label: {
    display: "block",
    fontWeight: 700,
    fontSize: 14,
    color: c.text,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "0.7rem 0.8rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    fontSize: 15,
    color: c.text,
    boxSizing: "border-box",
  },
  otpInput: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: "center",
    fontFamily: "monospace",
    color: c.primary,
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: c.primary,
    color: c.surface,
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: 8,
  },
  // Botão dourado: o passo que a gente quer que a pessoa dê.
  goldButton: {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: c.gold,
    color: c.primary,
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: 8,
  },
  buttonOff: { opacity: 0.5, cursor: "not-allowed" },
  linkButton: {
    width: "100%",
    marginTop: 14,
    padding: "0.5rem",
    background: "none",
    border: "none",
    color: c.secondary,
    fontSize: 14,
    textDecoration: "underline",
    cursor: "pointer",
  },
  error: {
    background: "#fef2f2",
    border: `1px solid ${c.warning}`,
    borderRadius: theme.radius.sm,
    padding: 12,
    color: c.warningText,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 1.5,
  },
};
