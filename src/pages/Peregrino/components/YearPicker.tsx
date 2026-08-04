import React from "react";
import { theme } from "../../../styles/theme";

/**
 * As caixas de "em quais anos você caminhou?".
 *
 * Mesma peça no primeiro acesso e no perfil: é a mesma pergunta, e duas cópias
 * divergiriam no primeiro ajuste. Só a moldura muda — no primeiro acesso o
 * fundo é claro, no dashboard é o azul.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  grid: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: "0.45rem 0.9rem",
    borderRadius: theme.radius.pill,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.text,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  chipOn: {
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    borderColor: c.goldDark,
    color: "#4a3105",
    fontWeight: 800,
  },
};

interface YearPickerProps {
  available: number[];
  selected: number[];
  onToggle: (year: number) => void;
}

const YearPicker: React.FC<YearPickerProps> = ({ available, selected, onToggle }) => (
  <div style={styles.grid}>
    {available.map(year => {
      const isOn = selected.includes(year);
      return (
        <button
          key={year}
          type="button"
          style={{ ...styles.chip, ...(isOn ? styles.chipOn : {}) }}
          onClick={() => onToggle(year)}
          aria-pressed={isOn}
        >
          {year}
        </button>
      );
    })}
  </div>
);

export default YearPicker;
