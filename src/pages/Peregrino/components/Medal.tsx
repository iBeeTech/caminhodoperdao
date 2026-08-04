import React from "react";
import { theme } from "../../../styles/theme";
import { BadgeTier } from "../api";

/**
 * A medalha, no formato que jogo usa: medalhão redondo, fita, e o metal
 * dizendo o valor da conquista antes de qualquer texto.
 *
 * A medalha AINDA NÃO conquistada aparece apagada, com cadeado e o que falta
 * para abri-la. É de propósito: a lista só com o que já foi ganho não dá razão
 * nenhuma para voltar no ano que vem.
 */

const c = theme.colors;

interface TierLook {
  ring: string;
  face: string;
  ink: string;
  ribbon: string;
}

const TIERS: Record<BadgeTier, TierLook> = {
  bronze: {
    ring: "#b0703a",
    face: "linear-gradient(150deg, #e2a86a 0%, #a35f2c 100%)",
    ink: "#4a2609",
    ribbon: "#8b4f24",
  },
  prata: {
    ring: "#9aa7b8",
    face: "linear-gradient(150deg, #f2f5f9 0%, #a9b6c6 100%)",
    ink: "#2f3d4f",
    ribbon: "#7d8b9c",
  },
  ouro: {
    ring: c.goldDark,
    face: `linear-gradient(150deg, ${c.goldSoft} 0%, ${c.gold} 55%, ${c.goldDark} 100%)`,
    ink: "#5b3d05",
    ribbon: c.goldDark,
  },
};

const DISC = 74;

const styles: Record<string, React.CSSProperties> = {
  item: {
    width: 128,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
  },
  discWrap: { position: "relative", paddingTop: 10 },
  ribbon: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 26,
    height: 22,
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)",
  },
  disc: {
    position: "relative",
    width: DISC,
    height: DISC,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    lineHeight: 1,
    boxShadow: "0 8px 18px rgba(0,0,0,0.22), inset 0 2px 6px rgba(255,255,255,0.55)",
  },
  label: { fontSize: 13, fontWeight: 800, color: c.surface, margin: 0, lineHeight: 1.3 },
  description: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    margin: 0,
    lineHeight: 1.45,
  },
  lockedDisc: {
    width: DISC,
    height: DISC,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.55)",
    fontSize: 26,
  },
};

interface MedalProps {
  label: string;
  description: string;
  tier: BadgeTier;
  /** Ano no centro do medalhão; sem ele entra a cruz do evento. */
  year?: number;
  isLocked?: boolean;
}

const Medal: React.FC<MedalProps> = ({ label, description, tier, year, isLocked = false }) => {
  if (isLocked) {
    return (
      <div style={styles.item}>
        <div style={styles.discWrap}>
          <div style={styles.lockedDisc} aria-hidden="true">
            🔒
          </div>
        </div>
        <p style={{ ...styles.label, color: "rgba(255,255,255,0.62)" }}>{label}</p>
        <p style={styles.description}>{description}</p>
      </div>
    );
  }

  const look = TIERS[tier];
  return (
    <div style={styles.item}>
      <div style={styles.discWrap}>
        <div style={{ ...styles.ribbon, background: look.ribbon }} aria-hidden="true" />
        <div
          style={{
            ...styles.disc,
            background: look.face,
            border: `3px solid ${look.ring}`,
            color: look.ink,
            fontSize: year ? 19 : 30,
          }}
          aria-hidden="true"
        >
          {year ?? "✝"}
        </div>
      </div>
      <p style={styles.label}>{label}</p>
      <p style={styles.description}>{description}</p>
    </div>
  );
};

export default Medal;
