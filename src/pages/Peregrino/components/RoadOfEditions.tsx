import React from "react";
import { theme } from "../../../styles/theme";
import { EDITION_THEMES, NEXT_EDITION, editionNumber } from "../../../data/editions";

/**
 * A estrada das edições.
 *
 * Cada edição é uma pedra: as que a pessoa caminhou ficam acesas em dourado, a
 * do ano que vem fica apagada e pontilhada, com a data.
 *
 * ⚠️ **Todas as pedras cabem na tela.** A primeira versão rolava na horizontal,
 * e rolagem lateral é o gesto que menos gente descobre — quem não arrastasse
 * nunca veria as edições antigas, que são justamente as que dão sentido à
 * palavra "estrada". Agora as pedras QUEBRAM EM LINHAS, e o asfalto é um fundo
 * repetido a cada faixa em vez de um traço por pedra: sai um `<li>` conector
 * para cada edição (eram 19), e a linha passa a acompanhar a quebra sozinha.
 *
 * O balão mostra tema e número de peregrinos. Passar o mouse ABRE, clicar
 * TRAVA — no celular não existe "passar o mouse", então sem o clique a
 * informação seria inacessível em metade dos aparelhos.
 */

const c = theme.colors;

const STONE = 44;
const CAPTION = 16;
const ROW_GAP = 14;
/** Altura de uma faixa da estrada. É com ela que o asfalto de fundo se alinha. */
const ROW_HEIGHT = STONE + 6 + CAPTION + ROW_GAP;

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: "relative" },
  track: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: `${ROW_GAP}px`,
    columnGap: 18,
    listStyle: "none",
    margin: 0,
    padding: 0,
    // O asfalto: uma linha horizontal na altura do centro da pedra, repetida a
    // cada faixa. Desenhada como fundo, e não como elemento, é o que faz a
    // estrada continuar certa quando as pedras quebram de linha.
    backgroundImage: `repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent ${STONE / 2 - 2}px,
      rgba(255,255,255,0.14) ${STONE / 2 - 2}px,
      rgba(255,255,255,0.14) ${STONE / 2 + 1}px,
      transparent ${STONE / 2 + 1}px,
      transparent ${ROW_HEIGHT}px
    )`,
  },
  stoneWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    position: "relative",
  },
  stone: {
    width: STONE,
    height: STONE,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    boxSizing: "border-box",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  stoneOn: {
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, ${c.gold} 60%, ${c.goldDark} 100%)`,
    border: `2px solid ${c.goldDark}`,
    color: "#5b3d05",
    boxShadow: "0 0 0 4px rgba(242,184,36,0.18), 0 6px 14px rgba(0,0,0,0.25)",
  },
  stoneOff: {
    background: "rgba(255,255,255,0.07)",
    border: "2px solid rgba(255,255,255,0.28)",
    color: "rgba(255,255,255,0.6)",
  },
  stoneNext: {
    background: "rgba(255,255,255,0.04)",
    border: `2px dashed rgba(242,184,36,0.55)`,
    color: "rgba(253,233,176,0.85)",
  },
  stoneSelected: { outline: `3px solid ${c.goldSoft}`, outlineOffset: 3 },
  /** A edição mais recente já realizada, para ela não se perder no meio. */
  stoneCurrent: { boxShadow: `0 0 0 3px rgba(253,233,176,0.35)` },
  caption: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    height: CAPTION,
    lineHeight: `${CAPTION}px`,
  },
  captionOn: { color: c.goldSoft, fontWeight: 700 },

  balloon: {
    position: "absolute",
    bottom: `calc(100% + 10px)`,
    left: "50%",
    transform: "translateX(-50%)",
    width: 210,
    background: "#fff",
    color: c.text,
    borderRadius: theme.radius.md,
    boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
    padding: "12px 14px",
    zIndex: 30,
    textAlign: "left",
  },
  balloonTitle: { margin: 0, fontSize: 13, fontWeight: 800, color: c.primary },
  balloonRow: { margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: c.text },
  balloonMuted: { margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: c.muted, fontStyle: "italic" },
  balloonTag: {
    display: "inline-block",
    marginTop: 8,
    padding: "0.1rem 0.5rem",
    borderRadius: 999,
    background: c.goldSoft,
    color: "#5b3d05",
    fontSize: 11,
    fontWeight: 800,
  },
  balloonArrow: {
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "7px solid transparent",
    borderRight: "7px solid transparent",
    borderTop: "8px solid #fff",
  },
  hint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    margin: "14px 0 0",
  },
};

interface RoadOfEditionsProps {
  /** Todas as edições já realizadas, da mais antiga para a mais recente. */
  editions: number[];
  walkedYears: number[];
  currentYear: number;
  /** Peregrinos pagos por ano, vindo de `/api/editions`. */
  participants: Record<string, number>;
}

interface BalloonProps {
  year: number;
  isWalked: boolean;
  isNext: boolean;
  participants?: number;
}

const Balloon: React.FC<BalloonProps> = ({ year, isWalked, isNext, participants }) => {
  const theme2025Onwards = EDITION_THEMES[year];
  return (
    <div style={styles.balloon} role="tooltip">
      <p style={styles.balloonTitle}>
        {isNext ? NEXT_EDITION.number : editionNumber(year)}ª edição — {year}
      </p>

      {isNext ? (
        <p style={styles.balloonRow}>A caminhada será em {NEXT_EDITION.date}.</p>
      ) : participants !== undefined ? (
        <p style={styles.balloonRow}>
          <strong>{participants}</strong> peregrinos caminharam.
        </p>
      ) : (
        <p style={styles.balloonMuted}>Não temos o número de peregrinos deste ano.</p>
      )}

      {theme2025Onwards ? (
        <p style={styles.balloonRow}>
          <strong>Tema:</strong> {theme2025Onwards}
        </p>
      ) : (
        <p style={styles.balloonMuted}>
          {year >= 2025 ? "Tema ainda não registrado." : "Esta edição não teve tema."}
        </p>
      )}

      {isWalked && <span style={styles.balloonTag}>você caminhou</span>}
      <span style={styles.balloonArrow} aria-hidden="true" />
    </div>
  );
};

const RoadOfEditions: React.FC<RoadOfEditionsProps> = ({
  editions,
  walkedYears,
  currentYear,
  participants,
}) => {
  const walked = React.useMemo(() => new Set(walkedYears), [walkedYears]);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);

  // A pedra travada manda; o mouse só decide quando não há nada travado. Sem
  // essa ordem, passar o mouse por cima destravaria o que a pessoa fixou.
  const shown = selected ?? hovered;

  const allStones = [...editions, NEXT_EDITION.year];

  return (
    <div style={styles.wrap}>
      <ul style={styles.track}>
        {allStones.map(year => {
          const isNext = year === NEXT_EDITION.year;
          const isOn = walked.has(year);
          const isSelected = selected === year;
          return (
            <li
              key={year}
              style={styles.stoneWrap}
              onMouseEnter={() => setHovered(year)}
              onMouseLeave={() => setHovered(current => (current === year ? null : current))}
            >
              {shown === year && (
                <Balloon
                  year={year}
                  isWalked={isOn}
                  isNext={isNext}
                  participants={participants[String(year)]}
                />
              )}

              <button
                type="button"
                style={{
                  ...styles.stone,
                  ...(isNext ? styles.stoneNext : isOn ? styles.stoneOn : styles.stoneOff),
                  ...(year === currentYear ? styles.stoneCurrent : {}),
                  ...(isSelected ? styles.stoneSelected : {}),
                }}
                aria-pressed={isSelected}
                aria-label={`${isNext ? NEXT_EDITION.number : editionNumber(year)}ª edição, ${year}`}
                onClick={() => setSelected(current => (current === year ? null : year))}
              >
                {isNext ? NEXT_EDITION.number : editionNumber(year)}ª
              </button>

              <span
                style={{
                  ...styles.caption,
                  ...(isOn ? styles.captionOn : {}),
                  ...(isNext ? { color: "rgba(253,233,176,0.8)", fontWeight: 700 } : {}),
                }}
              >
                {year}
              </span>
            </li>
          );
        })}
      </ul>

      <p style={styles.hint}>
        Passe o mouse — ou toque — em uma edição para ver os detalhes. Clique para deixar o
        balão fixo. A pedra com o contorno é a que está fixada.
      </p>
    </div>
  );
};

export default RoadOfEditions;
