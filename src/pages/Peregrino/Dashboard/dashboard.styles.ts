import React from "react";
import { theme } from "../../../styles/theme";

/**
 * A área logada é um painel ESCURO, ao contrário do site, que é claro.
 *
 * Não é enfeite: o dourado das medalhas só brilha sobre fundo escuro. No branco
 * ele vira bege e a conquista some. O site continua claro; quem entra na conta
 * atravessa uma porta e percebe isso.
 */

const c = theme.colors;

export const dashboardStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(165deg, ${c.gradientStart} 0%, #0f1836 100%)`,
    padding: "28px 16px 64px",
  },
  shell: { maxWidth: 900, margin: "0 auto" },

  hero: { marginBottom: 28 },
  eyebrow: {
    color: c.goldSoft,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  heroTitle: {
    color: c.surface,
    fontSize: "clamp(1.8rem, 1.2rem + 2.4vw, 2.8rem)",
    lineHeight: 1.1,
    margin: "0 0 10px",
    fontWeight: 800,
  },
  heroText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 560,
  },

  stats: { display: "flex", flexWrap: "wrap", gap: 12, margin: "22px 0 0" },
  stat: {
    flex: "1 1 150px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: theme.radius.md,
    padding: "14px 16px",
  },
  statValue: { color: c.gold, fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.1 },
  statLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    margin: "4px 0 0",
    lineHeight: 1.4,
  },

  panel: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: theme.radius.lg,
    padding: "20px 18px",
    marginTop: 22,
  },
  panelTitle: {
    color: c.surface,
    fontSize: 17,
    fontWeight: 800,
    margin: "0 0 4px",
  },
  panelHelp: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 1.6,
    margin: "0 0 16px",
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
