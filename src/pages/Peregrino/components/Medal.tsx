import React from "react";
import { theme } from "../../../styles/theme";
import { BadgeTier } from "../api";

/**
 * A medalha, no formato que jogo usa: medalhão redondo, fita, e o metal
 * dizendo o valor da conquista antes de qualquer texto.
 *
 * ⚠️ **Cada conquista rara tem COR PRÓPRIA.** Enquanto Fundador, Servo e a de
 * 10 anos eram todas douradas iguais, a raridade sumia no meio da fileira: a
 * pessoa via cinco discos amarelos e não sabia qual era o difícil. Agora o
 * comum tem metal (bronze por ano, prata a cada 5, ouro a cada 10) e o
 * exclusivo tem cor que não se repete em mais nada.
 *
 * A medalha AINDA NÃO conquistada aparece apagada, com cadeado e o que falta
 * para abri-la. A lista só com o que já foi ganho não dá razão nenhuma para
 * voltar no ano que vem.
 */

const c = theme.colors;

interface TierLook {
  ring: string;
  face: string;
  ink: string;
  ribbon: string;
  /** Brilho ao redor. Só as exclusivas têm — é o que as faz "pular" da grade. */
  glow?: string;
}

const TIERS: Record<BadgeTier, TierLook> = {
  // --- Os metais: conquista que se repete ao longo dos anos ---
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

  // --- As exclusivas: cada uma com cor que não aparece em mais nada ---
  /** Amanhecer: o primeiro passo, uma vez na vida. */
  primeira: {
    ring: "#c2541f",
    face: "linear-gradient(150deg, #ffd9a8 0%, #f4813f 55%, #d0561d 100%)",
    ink: "#5b2408",
    ribbon: "#b34a1a",
    glow: "rgba(244,129,63,0.30)",
  },
  /** Aço: quem já conhece o caminho de cor. */
  veterano: {
    ring: "#2f5d8a",
    face: "linear-gradient(150deg, #cfe4f7 0%, #5c93c8 55%, #2f5d8a 100%)",
    ink: "#12314d",
    ribbon: "#27506f",
    glow: "rgba(92,147,200,0.30)",
  },
  /** Vinho com anel dourado: relíquia da primeira edição. */
  fundador: {
    ring: c.gold,
    face: "linear-gradient(150deg, #a53a4a 0%, #6d1725 100%)",
    ink: "#ffe9c7",
    ribbon: "#5c111d",
    glow: "rgba(242,184,36,0.35)",
  },
  /** Verde: serviço, a única medalha que a organização concede. */
  servo: {
    ring: "#0f6b46",
    face: "linear-gradient(150deg, #b6f0d3 0%, #2fae7c 55%, #0f6b46 100%)",
    ink: "#083b26",
    ribbon: "#0d5c3c",
    glow: "rgba(47,174,124,0.30)",
  },
  /** Ametista: 25 caminhadas, o marco que quase ninguém alcança. */
  jubileu: {
    ring: "#6b3fa0",
    face: "linear-gradient(150deg, #e6d4ff 0%, #9a63e0 50%, #5b2d91 100%)",
    ink: "#2e1152",
    ribbon: "#54297f",
    glow: "rgba(154,99,224,0.38)",
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
  /** Ano no centro do medalhão. */
  year?: number;
  /** Símbolo no centro quando não há ano; sem os dois, entra a cruz. */
  symbol?: string;
  isLocked?: boolean;
}

const Medal: React.FC<MedalProps> = ({
  label,
  description,
  tier,
  year,
  symbol,
  isLocked = false,
}) => {
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

  const look = TIERS[tier] ?? TIERS.bronze;
  const center = year !== undefined ? String(year) : (symbol ?? "✝");
  // Ano tem quatro dígitos e precisa caber; símbolo de um caractere pode ser
  // grande e ganhar presença.
  const fontSize = year !== undefined ? 19 : center.length > 1 ? 24 : 30;

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
            fontSize,
            boxShadow: look.glow
              ? `0 0 0 5px ${look.glow}, 0 8px 18px rgba(0,0,0,0.28), inset 0 2px 6px rgba(255,255,255,0.35)`
              : "0 8px 18px rgba(0,0,0,0.22), inset 0 2px 6px rgba(255,255,255,0.55)",
          }}
          aria-hidden="true"
        >
          {center}
        </div>
      </div>
      <p style={styles.label}>{label}</p>
      <p style={styles.description}>{description}</p>
    </div>
  );
};

export default Medal;
