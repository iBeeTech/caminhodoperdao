import React from "react";
import { theme } from "../../../styles/theme";
import Medal from "./Medal";
import { Badge } from "../api";

/**
 * As medalhas de ano, empilhadas numa só.
 *
 * Quem caminhou dez edições tinha dez medalhas idênticas em fila, e elas
 * empurravam para fora da tela justamente as raras — Fundador, Servo, Guardião.
 * A pilha resolve os dois lados: ocupa o espaço de uma e continua dando acesso
 * a todas, num toque.
 */

const c = theme.colors;

const DISC = 74;

const styles: Record<string, React.CSSProperties> = {
  item: {
    width: 128,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  stack: { position: "relative", paddingTop: 10, width: DISC + 12, height: DISC + 10 },
  // As duas fatias de trás são só sombra de pilha: dizem "tem mais embaixo"
  // sem precisar de texto explicando.
  behind: {
    position: "absolute",
    top: 14,
    left: 12,
    width: DISC,
    height: DISC,
    borderRadius: "50%",
    background: "linear-gradient(150deg, #c98f4e 0%, #8b4f24 100%)",
    border: "3px solid #8b4f24",
    opacity: 0.55,
  },
  behind2: {
    position: "absolute",
    top: 12,
    left: 6,
    width: DISC,
    height: DISC,
    borderRadius: "50%",
    background: "linear-gradient(150deg, #d79c58 0%, #96562a 100%)",
    border: "3px solid #8b4f24",
    opacity: 0.75,
  },
  front: {
    position: "absolute",
    top: 10,
    left: 0,
    width: DISC,
    height: DISC,
    borderRadius: "50%",
    background: "linear-gradient(150deg, #e2a86a 0%, #a35f2c 100%)",
    border: "3px solid #b0703a",
    color: "#4a2609",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(0,0,0,0.22), inset 0 2px 6px rgba(255,255,255,0.55)",
  },
  label: { fontSize: 13, fontWeight: 800, color: c.surface, margin: 0, lineHeight: 1.3 },
  description: { fontSize: 11, color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.45 },

  // Fundo clicável como BOTÃO de verdade, não uma div com onClick: div com
  // clique não recebe foco nem responde ao teclado, e quem navega por Tab
  // ficaria preso na janela sem conseguir fechá-la.
  backdrop: {
    position: "absolute",
    inset: 0,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "default",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,16,38,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 2000,
  },
  modal: {
    // `relative` é obrigatório: o fundo clicável é absoluto, e elemento
    // posicionado pinta por cima de elemento estático — sem isto o fundo
    // cobriria o cartão e nenhum clique dentro dele funcionaria.
    position: "relative",
    background: `linear-gradient(160deg, ${c.gradientStart} 0%, #16204a 100%)`,
    borderRadius: theme.radius.lg,
    padding: "22px 20px",
    width: "100%",
    maxWidth: 640,
    maxHeight: "85vh",
    overflowY: "auto",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    boxSizing: "border-box",
  },
  modalHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: { color: c.surface, fontSize: 18, fontWeight: 800, margin: 0 },
  modalHelp: { color: "rgba(255,255,255,0.62)", fontSize: 13, margin: "4px 0 0", lineHeight: 1.5 },
  close: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: c.surface,
    borderRadius: 999,
    width: 32,
    height: 32,
    fontSize: 16,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },
  grid: { display: "flex", flexWrap: "wrap", gap: 18 },
};

interface YearMedalsGroupProps {
  badges: Badge[];
}

const YearMedalsGroup: React.FC<YearMedalsGroupProps> = ({ badges }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (badges.length === 0) return null;

  const years = badges
    .map(badge => badge.year)
    .filter((year): year is number => typeof year === "number")
    .sort((a, b) => b - a);

  return (
    <>
      <button
        type="button"
        style={styles.item}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <div style={styles.stack} aria-hidden="true">
          <span style={styles.behind} />
          <span style={styles.behind2} />
          <span style={styles.front}>{badges.length}</span>
        </div>
        <p style={styles.label}>Medalhas de ano</p>
        <p style={styles.description}>
          {badges.length === 1 ? "1 edição" : `${badges.length} edições`} — toque para ver
        </p>
      </button>

      {isOpen && (
        <div style={styles.overlay}>
          <button
            type="button"
            style={styles.backdrop}
            aria-label="Fechar"
            onClick={() => setIsOpen(false)}
          />
          <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Suas medalhas de ano">
            <div style={styles.modalHead}>
              <div>
                <h2 style={styles.modalTitle}>Suas medalhas de ano</h2>
                <p style={styles.modalHelp}>
                  Uma para cada edição que você declarou: {years.join(", ")}.
                </p>
              </div>
              <button
                type="button"
                style={styles.close}
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div style={styles.grid}>
              {badges.map(badge => (
                <Medal
                  key={badge.id}
                  label={badge.label}
                  description={badge.description}
                  tier={badge.tier}
                  year={badge.year}
                  symbol={badge.symbol}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default YearMedalsGroup;
