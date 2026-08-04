import React from "react";
import { theme } from "../../../styles/theme";

/**
 * O perfil usa o mesmo fundo escuro do dashboard, mas o conteúdo mora em
 * cartões CLAROS: aqui é formulário, e campo de digitar sobre fundo escuro
 * cansa a vista e some no celular ao sol.
 */

const c = theme.colors;

export const perfilStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(165deg, ${c.gradientStart} 0%, #0f1836 100%)`,
    padding: "28px 16px 64px",
  },
  shell: { maxWidth: 720, margin: "0 auto" },
  eyebrow: {
    color: c.goldSoft,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  pageTitle: {
    color: c.surface,
    fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)",
    margin: "0 0 24px",
    fontWeight: 800,
  },

  card: {
    background: c.surface,
    borderRadius: theme.radius.lg,
    padding: 24,
    marginBottom: 18,
    boxShadow: theme.shadows.sm,
    boxSizing: "border-box",
  },
  cardTitle: { color: c.primary, fontSize: 17, fontWeight: 800, margin: "0 0 4px" },
  cardHelp: { color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" },

  // Cabeçalho clicável das seções que abrem e fecham.
  disclosure: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  disclosureIcon: { color: c.secondary, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" },

  readRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 0",
    borderBottom: `1px solid ${c.border}`,
  },
  readLabel: { color: c.muted, fontSize: 13, margin: 0 },
  readValue: {
    color: c.text,
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    textAlign: "right",
    wordBreak: "break-word",
  },
  readEmpty: { color: c.muted, fontWeight: 400, fontStyle: "italic" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldWide: { gridColumn: "1 / -1" },
  label: { fontWeight: 700, fontSize: 13, color: c.text },
  input: {
    width: "100%",
    padding: "0.65rem 0.75rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    fontSize: 15,
    color: c.text,
    background: c.surface,
    boxSizing: "border-box",
  },
  inputLocked: { background: "#f3f4f6", color: c.muted, cursor: "not-allowed" },
  hint: { color: c.muted, fontSize: 12, lineHeight: 1.5, margin: "2px 0 0" },
  hintLink: { color: c.secondary, fontWeight: 700 },

  checkRow: { display: "flex", alignItems: "center", gap: 8 },

  primaryButton: {
    padding: "0.75rem 1.2rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: c.primary,
    color: c.surface,
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    marginTop: 18,
  },
  goldButton: {
    padding: "0.75rem 1.2rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    color: "#4a3105",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    marginTop: 18,
  },
  buttonOff: { opacity: 0.55, cursor: "not-allowed" },

  ok: {
    background: "#f0fdf4",
    border: `1px solid ${c.successSoft}`,
    borderRadius: theme.radius.sm,
    padding: 10,
    color: "#14532d",
    fontSize: 13,
    marginTop: 14,
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
  loading: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    padding: "60px 0",
    fontSize: 15,
  },
};
