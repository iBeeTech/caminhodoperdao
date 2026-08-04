import React from "react";
import { theme } from "../../../styles/theme";
import { EDITION_THEMES, NEXT_EDITION, editionNumber } from "../../../data/editions";

/**
 * A estrada das edições.
 *
 * ⚠️ **A linha liga uma pedra à seguinte, e só.** A versão anterior desenhava um
 * traço de ponta a ponta como fundo da faixa, e ele passava POR TRÁS das pedras
 * e continuava depois da última — parecia uma régua riscando a tela, não uma
 * estrada. Agora cada trecho é um pedaço entre dois vizinhos, e depois do último
 * não há nada.
 *
 * O caminho **serpenteia**: as linhas alternam de direção e uma curva liga o fim
 * de uma ao começo da outra. É o que faz parecer estrada de verdade, e é
 * também o que permite mostrar todas as edições sem rolagem lateral — o gesto
 * que menos gente descobre.
 *
 * O balão mostra tema e número de peregrinos. Passar o mouse ABRE, clicar
 * TRAVA — no celular não existe "passar o mouse", então sem o clique a
 * informação seria inacessível em metade dos aparelhos.
 */

const c = theme.colors;

const STONE = 46;
/** Quantas pedras por linha, por faixa de largura. */
const BREAKPOINTS: { minWidth: number; perRow: number }[] = [
  { minWidth: 820, perRow: 7 },
  { minWidth: 640, perRow: 6 },
  { minWidth: 480, perRow: 5 },
  { minWidth: 0, perRow: 4 },
];

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: "relative" },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    background: "rgba(255,255,255,0.16)",
    marginBottom: 22,
    minWidth: 8,
  },
  segmentOn: { background: `linear-gradient(90deg, ${c.goldDark}, ${c.gold})` },
  segmentNext: {
    background: "none",
    borderTop: "3px dashed rgba(255,255,255,0.32)",
    height: 0,
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
    border: "2px dashed rgba(242,184,36,0.55)",
    color: "rgba(253,233,176,0.85)",
  },
  stoneSelected: { outline: `3px solid ${c.goldSoft}`, outlineOffset: 3 },
  stoneCurrent: { boxShadow: "0 0 0 3px rgba(253,233,176,0.35)" },
  caption: { fontSize: 11, color: "rgba(255,255,255,0.6)", height: 16, lineHeight: "16px" },
  captionOn: { color: c.goldSoft, fontWeight: 700 },

  // A curva que liga o fim de uma linha ao começo da seguinte. Duas bordas com
  // canto arredondado bastam — nada de SVG para desenhar um "U".
  turnRow: { display: "flex", height: 26 },
  turn: {
    width: 46,
    height: 26,
    border: "3px solid rgba(255,255,255,0.16)",
    borderTop: "none",
  },
  turnRight: {
    borderLeft: "none",
    borderBottomRightRadius: 26,
    marginLeft: "auto",
    marginRight: STONE / 2 - 2,
  },
  turnLeft: {
    borderRight: "none",
    borderBottomLeftRadius: 26,
    marginRight: "auto",
    marginLeft: STONE / 2 - 2,
  },
  turnOn: { borderColor: c.goldDark },

  balloon: {
    position: "absolute",
    bottom: "calc(100% + 10px)",
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
  balloonMuted: {
    margin: "6px 0 0",
    fontSize: 12,
    lineHeight: 1.5,
    color: c.muted,
    fontStyle: "italic",
  },
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
  hint: { color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "16px 0 0" },
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
  const editionTheme = EDITION_THEMES[year];
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

      {editionTheme ? (
        <p style={styles.balloonRow}>
          <strong>Tema:</strong> {editionTheme}
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

/** Quantas pedras cabem numa linha, para a largura atual. */
function usePerRow(ref: React.RefObject<HTMLDivElement>): number {
  const [perRow, setPerRow] = React.useState(7);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => {
      const width = element.clientWidth;
      const match = BREAKPOINTS.find(breakpoint => width >= breakpoint.minWidth);
      setPerRow(match ? match.perRow : 4);
    };
    measure();

    // ResizeObserver, e não `window.resize`: o painel muda de largura quando a
    // barra lateral some ou o cartão vizinho cresce, sem a janela mudar.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return perRow;
}

const RoadOfEditions: React.FC<RoadOfEditionsProps> = ({
  editions,
  walkedYears,
  currentYear,
  participants,
}) => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const perRow = usePerRow(wrapRef);
  const walked = React.useMemo(() => new Set(walkedYears), [walkedYears]);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);

  // A pedra travada manda; o mouse só decide quando não há nada travado. Sem
  // essa ordem, passar o mouse por cima destravaria o que a pessoa fixou.
  const shown = selected ?? hovered;

  const allStones = [...editions, NEXT_EDITION.year];
  const rows: number[][] = [];
  for (let index = 0; index < allStones.length; index += perRow) {
    rows.push(allStones.slice(index, index + perRow));
  }

  const renderStone = (year: number) => {
    const isNext = year === NEXT_EDITION.year;
    const isOn = walked.has(year);
    const isSelected = selected === year;
    return (
      <div
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
      </div>
    );
  };

  return (
    <div style={styles.wrap} ref={wrapRef}>
      {rows.map((row, rowIndex) => {
        // Linhas ímpares correm ao contrário: é a alternância que faz o caminho
        // serpentear em vez de recomeçar do zero a cada linha.
        const isReversed = rowIndex % 2 === 1;
        const isLastRow = rowIndex === rows.length - 1;
        const lastOfRow = row[row.length - 1];
        const firstOfNextRow = rows[rowIndex + 1]?.[0];

        return (
          <React.Fragment key={row[0]}>
            <div
              style={{
                ...styles.row,
                flexDirection: isReversed ? "row-reverse" : "row",
              }}
            >
              {row.map((year, indexInRow) => {
                const previous = row[indexInRow - 1];
                const isNextStone = year === NEXT_EDITION.year;
                const bothWalked =
                  previous !== undefined && walked.has(previous) && walked.has(year);
                return (
                  <React.Fragment key={year}>
                    {indexInRow > 0 && (
                      <span
                        aria-hidden="true"
                        style={{
                          ...styles.segment,
                          ...(bothWalked ? styles.segmentOn : {}),
                          ...(isNextStone ? styles.segmentNext : {}),
                        }}
                      />
                    )}
                    {renderStone(year)}
                  </React.Fragment>
                );
              })}
            </div>

            {!isLastRow && (
              <div style={styles.turnRow} aria-hidden="true">
                <span
                  style={{
                    ...styles.turn,
                    ...(isReversed ? styles.turnLeft : styles.turnRight),
                    ...(walked.has(lastOfRow) && firstOfNextRow !== undefined && walked.has(firstOfNextRow)
                      ? styles.turnOn
                      : {}),
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}

      <p style={styles.hint}>
        Passe o mouse — ou toque — em uma edição para ver os detalhes. Clique para deixar o
        balão fixo; a pedra com o contorno é a que está fixada.
      </p>
    </div>
  );
};

export default RoadOfEditions;
