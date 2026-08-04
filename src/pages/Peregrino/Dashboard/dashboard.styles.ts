import React from "react";
import { theme } from "../../../styles/theme";

/**
 * Página CLARA com faixas escuras nos dois lugares que precisam delas.
 *
 * A primeira versão era azul da borda ao rodapé e ficou pesada: tela inteira
 * escura cansa e faz texto comum brigar com o fundo. Mas o dourado da medalha
 * só brilha sobre escuro — no branco ele vira bege e a conquista some.
 *
 * A saída é dividir: fundo claro para ler, e duas FAIXAS escuras — a estrada e
 * a vitrine de medalhas —, que é onde o ouro precisa aparecer.
 */

const c = theme.colors;

export const dashboardStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: c.background,
    padding: "28px 16px 64px",
  },
  shell: { maxWidth: 900, margin: "0 auto" },

  hero: { marginBottom: 28 },
  eyebrow: {
    color: c.goldDark,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  heroTitle: {
    color: c.primary,
    fontSize: "clamp(1.8rem, 1.2rem + 2.4vw, 2.8rem)",
    lineHeight: 1.1,
    margin: "0 0 10px",
    fontWeight: 800,
  },
  heroText: {
    color: c.muted,
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 560,
  },

  stats: { display: "flex", flexWrap: "wrap", gap: 12, margin: "22px 0 0" },
  stat: {
    flex: "1 1 150px",
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: theme.radius.md,
    padding: "14px 16px",
  },
  statValue: { color: c.primary, fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.1 },
  statLabel: {
    color: c.muted,
    fontSize: 12,
    margin: "4px 0 0",
    lineHeight: 1.4,
  },

  // Cartão claro: o padrão da página.
  panel: {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: theme.radius.lg,
    padding: "20px 18px",
    marginTop: 22,
    boxShadow: theme.shadows.sm,
  },
  // Faixa escura: só onde o dourado precisa brilhar (estrada e medalhas).
  panelDark: {
    background: `linear-gradient(160deg, ${c.gradientStart} 0%, #16204a 100%)`,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: theme.radius.lg,
    padding: "20px 18px",
    marginTop: 22,
  },
  panelTitle: {
    color: c.primary,
    fontSize: 17,
    fontWeight: 800,
    margin: "0 0 4px",
  },
  panelTitleOnDark: {
    color: c.surface,
    fontSize: 17,
    fontWeight: 800,
    margin: "0 0 4px",
  },
  panelHelp: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  panelHelpOnDark: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  // Link discreto para a página que explica todas as medalhas e os temas.
  panelLink: {
    display: "inline-block",
    marginTop: 14,
    color: c.goldSoft,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "underline",
  },
  themeCallout: {
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, #fdf6e0 100%)`,
    border: `1px solid ${c.gold}`,
    borderRadius: theme.radius.md,
    padding: "14px 16px",
    marginTop: 22,
  },
  themeHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  themeLink: {
    color: "#7a5c10",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "underline",
    whiteSpace: "nowrap",
  },
  themeLabel: {
    color: "#7a5c10",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    margin: 0,
  },
  themeText: {
    color: "#4a3105",
    fontSize: 16,
    fontWeight: 700,
    margin: "4px 0 0",
    lineHeight: 1.4,
  },

  medalGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    justifyContent: "flex-start",
  },

  emptyDark: {
    border: "1px dashed rgba(255,255,255,0.28)",
    borderRadius: theme.radius.md,
    padding: 18,
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "center",
  },

  // Primeiro acesso: cartão claro, porque ali ainda é formulário, não vitrine.
  onboardCard: {
    background: c.surface,
    borderRadius: theme.radius.lg,
    padding: 28,
    maxWidth: 620,
    margin: "0 auto",
    boxShadow: theme.shadows.md,
    boxSizing: "border-box",
  },
  onboardTitle: { color: c.primary, fontSize: 22, margin: "0 0 8px", fontWeight: 800 },
  onboardHelp: { color: c.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" },

  goldButton: {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    color: "#4a3105",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: 20,
  },
  buttonOff: { opacity: 0.55, cursor: "not-allowed" },
  ghostButton: {
    width: "100%",
    marginTop: 12,
    padding: "0.6rem",
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
  loading: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    padding: "60px 0",
    fontSize: 15,
  },
};
