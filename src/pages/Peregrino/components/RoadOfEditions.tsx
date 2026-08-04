import React from "react";
import { theme } from "../../../styles/theme";
import { NEXT_EDITION, editionNumber } from "../../../data/editions";

/**
 * A estrada das edições.
 *
 * Cada edição já realizada é uma pedra do caminho; as que a pessoa caminhou
 * ficam acesas em dourado, e o trecho entre duas acesas vira estrada percorrida.
 *
 * A pedra mostra o NÚMERO da edição (2008 = 1ª, 2026 = 19ª), com o ano embaixo.
 * Antes mostrava o ano abreviado — "23, 24, 25" — que parecia idade ou dia do
 * mês e não respondia a pergunta que a estrada faz: quantas já houve.
 *
 * Depois da edição atual vem a pedra da PRÓXIMA, apagada e com a data: o
 * tracejado sozinho dizia "tem mais", mas não dizia quando.
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
    width: 60,
    height: 0,
    borderTop: "3px dashed rgba(255,255,255,0.35)",
    flexShrink: 0,
    marginBottom: 20,
  },
  // A pedra do ano que vem: mesma forma das outras, mas apagada e pontilhada —
  // está no mapa, ainda não no histórico de ninguém.
  stoneNext: {
    background: "rgba(255,255,255,0.04)",
    border: "2px dashed rgba(242,184,36,0.55)",
    color: "rgba(253,233,176,0.85)",
  },
  nextCaption: { fontSize: 11, color: "rgba(253,233,176,0.8)", fontWeight: 700 },
  nextDate: { fontSize: 10, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" },
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
                    isOn
                      ? `Você caminhou na ${editionNumber(year)}ª edição, em ${year}`
                      : `${editionNumber(year)}ª edição, em ${year}`
                  }
                >
                  {editionNumber(year)}ª
                </div>
                <span style={{ ...styles.caption, ...(isOn ? styles.captionOn : {}) }}>
                  {year}
                </span>
              </li>
            </React.Fragment>
          );
        })}

        <li aria-hidden="true" style={styles.tail} />
        <li style={styles.stoneWrap}>
          <div
            style={{ ...styles.stone, ...styles.stoneNext }}
            title={`${NEXT_EDITION.number}ª edição, em ${NEXT_EDITION.date}`}
          >
            {NEXT_EDITION.number}ª
          </div>
          <span style={styles.nextCaption}>{NEXT_EDITION.year}</span>
          <span style={styles.nextDate}>{NEXT_EDITION.date}</span>
        </li>
      </ul>
    </div>
  );
};

export default RoadOfEditions;
