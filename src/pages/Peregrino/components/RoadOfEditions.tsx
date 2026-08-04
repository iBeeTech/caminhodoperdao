import React from "react";
import { theme } from "../../../styles/theme";

/**
 * A estrada das edições.
 *
 * Cada edição já realizada é uma pedra do caminho; as que a pessoa caminhou
 * ficam acesas em dourado, e o trecho entre duas acesas vira estrada percorrida.
 * Depois da edição atual a linha segue TRACEJADA, sem número: é o que ainda vem.
 *
 * Rola na horizontal de propósito. Uma estrada que quebra em várias linhas
 * deixa de parecer estrada — e são 19 edições, que não cabem numa tela de
 * celular de jeito nenhum. Abre já no fim, onde estão os anos recentes.
 */

const c = theme.colors;

const STONE = 46;

const styles: Record<string, React.CSSProperties> = {
  scroller: {
    overflowX: "auto",
    overflowY: "hidden",
    padding: "8px 4px 4px",
    WebkitOverflowScrolling: "touch",
  },
  track: {
    display: "flex",
    alignItems: "center",
    width: "max-content",
    padding: "0 4px",
  },
  stoneWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  stone: {
    width: STONE,
    height: STONE,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    boxSizing: "border-box",
  },
  stoneOn: {
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, ${c.gold} 60%, ${c.goldDark} 100%)`,
    border: `2px solid ${c.goldDark}`,
    color: "#5b3d05",
    boxShadow: `0 0 0 4px rgba(242,184,36,0.18), 0 6px 14px rgba(0,0,0,0.25)`,
  },
  stoneOff: {
    background: "rgba(255,255,255,0.07)",
    border: "2px solid rgba(255,255,255,0.28)",
    color: "rgba(255,255,255,0.6)",
  },
  stoneCurrent: { outline: `2px dotted ${c.goldSoft}`, outlineOffset: 4 },
  caption: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    height: 14,
    lineHeight: "14px",
  },
  captionOn: { color: c.goldSoft, fontWeight: 700 },
  link: { width: 26, height: 6, borderRadius: 3, flexShrink: 0, marginBottom: 20 },
  linkOn: { background: `linear-gradient(90deg, ${c.goldDark}, ${c.gold})` },
  linkOff: { background: "rgba(255,255,255,0.16)" },
  tail: {
    width: 96,
    height: 0,
    borderTop: "3px dashed rgba(255,255,255,0.35)",
    flexShrink: 0,
    marginBottom: 20,
  },
  tailFlag: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 4,
  },
  tailIcon: { fontSize: 22, opacity: 0.75 },
  tailText: { fontSize: 11, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" },
};

interface RoadOfEditionsProps {
  /** Todas as edições já realizadas, da mais antiga para a mais recente. */
  editions: number[];
  walkedYears: number[];
  currentYear: number;
}

const RoadOfEditions: React.FC<RoadOfEditionsProps> = ({
  editions,
  walkedYears,
  currentYear,
}) => {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const walked = React.useMemo(() => new Set(walkedYears), [walkedYears]);

  React.useEffect(() => {
    const element = scrollerRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [editions.length]);

  return (
    <div style={styles.scroller} ref={scrollerRef}>
      <ul style={{ ...styles.track, listStyle: "none", margin: 0 }}>
        {editions.map((year, index) => {
          const isOn = walked.has(year);
          const previousOn = index > 0 && walked.has(editions[index - 1]);
          return (
            <React.Fragment key={year}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  style={{
                    ...styles.link,
                    ...(isOn && previousOn ? styles.linkOn : styles.linkOff),
                  }}
                />
              )}
              <li style={styles.stoneWrap}>
                <div
                  style={{
                    ...styles.stone,
                    ...(isOn ? styles.stoneOn : styles.stoneOff),
                    ...(year === currentYear ? styles.stoneCurrent : {}),
                  }}
                  title={
                    isOn ? `Você caminhou em ${year}` : `Edição de ${year}`
                  }
                >
                  {String(year).slice(2)}
                </div>
                <span style={{ ...styles.caption, ...(isOn ? styles.captionOn : {}) }}>
                  {year}
                </span>
              </li>
            </React.Fragment>
          );
        })}

        <li aria-hidden="true" style={styles.tail} />
        <li style={styles.tailFlag}>
          <span style={styles.tailIcon} aria-hidden="true">
            ⛰️
          </span>
          <span style={styles.tailText}>o caminho continua</span>
        </li>
      </ul>
    </div>
  );
};

export default RoadOfEditions;
