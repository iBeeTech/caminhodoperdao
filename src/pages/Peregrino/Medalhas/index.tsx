import React from "react";
import { Header } from "../../../components";
import Medal from "../components/Medal";
import { theme } from "../../../styles/theme";
import { EDITION_THEMES, NEXT_EDITION, listEditions } from "../../../data/editions";
import { useScrollToHash } from "../../../hooks/useScrollToHash";

/**
 * `/medalhas` — o catálogo: todas as medalhas que existem e o tema de cada ano.
 *
 * Aberta a qualquer um, inclusive a quem não tem conta. Medalha que só quem já
 * ganhou consegue ver não convida ninguém a voltar — o catálogo é justamente o
 * que mostra o que há para conquistar.
 *
 * As regras aqui são um ESPELHO de `functions/_utils/badges.ts`. Não dá para
 * importar aquele arquivo (ele roda no servidor), então a fonte da verdade
 * continua lá: mudou lá, muda aqui.
 */

const c = theme.colors;

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: c.background, padding: "28px 16px 64px" },
  shell: { maxWidth: 900, margin: "0 auto" },
  eyebrow: {
    color: c.goldDark,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  title: {
    color: c.primary,
    fontSize: "clamp(1.7rem, 1.2rem + 2vw, 2.4rem)",
    margin: "0 0 10px",
    fontWeight: 800,
  },
  lead: { color: c.muted, fontSize: 15, lineHeight: 1.6, margin: "0 0 8px", maxWidth: 620 },
  sectionTitle: { color: c.primary, fontSize: 18, fontWeight: 800, margin: "32px 0 4px" },
  sectionHelp: { color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" },
  showcase: {
    background: `linear-gradient(160deg, ${c.gradientStart} 0%, #16204a 100%)`,
    borderRadius: theme.radius.lg,
    padding: "22px 18px",
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: c.surface,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    border: `1px solid ${c.border}`,
    fontSize: 14,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: c.background,
    color: c.primary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderBottom: `1px solid ${c.border}`,
  },
  td: { padding: "10px 12px", borderBottom: `1px solid ${c.border}`, color: c.text },
  tdMuted: { color: c.muted, fontStyle: "italic" },
  tdNum: { fontWeight: 800, color: c.primary, whiteSpace: "nowrap" },
  scroller: { overflowX: "auto" },
  next: {
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, #fdf6e0 100%)`,
    border: `1px solid ${c.gold}`,
    borderRadius: theme.radius.md,
    padding: "14px 16px",
    marginTop: 16,
    color: "#4a3105",
    fontSize: 14,
    lineHeight: 1.6,
  },
};

/**
 * Espelho de `functions/_utils/badges.ts`. Mudou lá, muda aqui.
 *
 * A ordem é a da raridade: o que se ganha todo ano primeiro, o que quase
 * ninguém alcança por último.
 */
const CATALOG = [
  {
    id: "ano",
    label: "Peregrino do ano",
    description: "Uma para cada edição em que você caminhou.",
    tier: "bronze" as const,
    symbol: undefined as string | undefined,
    year: 2026 as number | undefined,
    how: "Marque o ano no seu perfil.",
    when: "Toda edição",
  },
  {
    id: "prata",
    label: "5, 10, 15... caminhadas",
    description: "Uma prata a cada bloco de 5 edições. Elas acumulam.",
    tier: "prata" as const,
    symbol: "5",
    year: undefined,
    how: "Complete 5 edições — e outra a cada 5.",
    when: "A cada 5 edições",
  },
  {
    id: "ouro",
    label: "10, 20, 30... caminhadas",
    description: "Um ouro a cada bloco de 10 edições. Também acumulam.",
    tier: "ouro" as const,
    symbol: "10",
    year: undefined,
    how: "Complete 10 edições — e outro a cada 10.",
    when: "A cada 10 edições",
  },
  {
    id: "primeira",
    label: "Primeira caminhada",
    description: "Toda caminhada começa com um primeiro passo.",
    tier: "primeira" as const,
    symbol: "1",
    year: undefined,
    how: "Declare a sua primeira edição.",
    when: "Uma vez na vida",
  },
  {
    id: "veterano",
    label: "Veterano",
    description: "5 caminhadas. Você conhece o caminho de cor.",
    tier: "veterano" as const,
    symbol: "✦",
    year: undefined,
    how: "Complete 5 edições.",
    when: "Uma vez na vida",
  },
  {
    id: "fundador",
    label: "Fundador",
    description: "Você caminhou na primeira edição, em 2008.",
    tier: "fundador" as const,
    symbol: "✝",
    year: undefined,
    how: "Ter caminhado em 2008.",
    when: "Impossível conquistar hoje",
  },
  {
    id: "servo",
    label: "Servo",
    description: "Você serve o Caminho do Perdão junto com a organização.",
    tier: "servo" as const,
    symbol: "✚",
    year: undefined,
    how: "Concedida pela organização — a única que não é auto-declarada.",
    when: "Por indicação",
  },
  {
    id: "jubileu",
    label: "Jubileu",
    description: "25 caminhadas. Uma vida inteira no caminho.",
    tier: "jubileu" as const,
    symbol: "★",
    year: undefined,
    how: "Complete 25 edições.",
    when: "Uma vez na vida",
  },
];

/** Nome legível da cor, para a tabela não mostrar o código interno. */
const TIER_NAMES: Record<string, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  primeira: "Exclusiva — amanhecer",
  veterano: "Exclusiva — aço",
  fundador: "Exclusiva — vinho e ouro",
  servo: "Exclusiva — verde",
  jubileu: "Exclusiva — ametista",
};

const MedalhasPage: React.FC = () => {
  const editions = listEditions();
  // Faz o /medalhas#temas do painel cair direto na tabela de temas. Sem isto o
  // link levava ao topo da página e a pessoa tinha de rolar até achar a seção —
  // o React Router não rola por hash sozinho.
  useScrollToHash();

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.shell}>
          <p style={s.eyebrow}>Caminho do Perdão</p>
          <h1 style={s.title}>Medalhas e temas</h1>
          <p style={s.lead}>
            Aqui estão todas as medalhas que existem e o tema de cada edição. As medalhas
            aparecem na sua caminhada conforme você marca os anos em que participou.
          </p>

          <h2 style={s.sectionTitle}>As medalhas</h2>
          <p style={s.sectionHelp}>
            Bronze é a do ano, prata vem a cada 5 caminhadas e ouro a cada 10 — essas
            acumulam. As de <strong>cor própria</strong> são exclusivas: só se ganham uma
            vez. Só a de <strong>Servo</strong> é concedida pela organização; as outras
            saem do que você mesmo declara.
          </p>

          <div style={s.showcase}>
            {CATALOG.map(badge => (
              <Medal
                key={badge.id}
                label={badge.label}
                description={badge.description}
                tier={badge.tier}
                symbol={badge.symbol}
                year={badge.year}
              />
            ))}
          </div>

          <div style={s.scroller}>
            <table style={{ ...s.table, marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={s.th}>Medalha</th>
                  <th style={s.th}>Cor</th>
                  <th style={s.th}>Quando</th>
                  <th style={s.th}>Como conquistar</th>
                </tr>
              </thead>
              <tbody>
                {CATALOG.map(badge => (
                  <tr key={badge.id}>
                    <td style={{ ...s.td, fontWeight: 700 }}>{badge.label}</td>
                    <td style={s.td}>{TIER_NAMES[badge.tier]}</td>
                    <td style={s.td}>{badge.when}</td>
                    <td style={s.td}>{badge.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* scrollMarginTop por causa do cabeçalho sticky (70px no desktop, 60
              no celular): sem ele o título para embaixo da barra e a pessoa acha
              que o link errou o lugar. Mesma folga usada na landing. */}
          <h2 id="temas" style={{ ...s.sectionTitle, scrollMarginTop: 80 }}>
            Os temas de cada edição
          </h2>
          <p style={s.sectionHelp}>
            Os temas registrados começam em 2024.
          </p>

          <div style={s.scroller}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Edição</th>
                  <th style={s.th}>Ano</th>
                  <th style={s.th}>Tema</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={s.tdNum}>{NEXT_EDITION.number}ª</td>
                  <td style={s.td}>{NEXT_EDITION.year}</td>
                  <td style={{ ...s.td, ...s.tdMuted }}>
                    a caminhada será em {NEXT_EDITION.date}
                  </td>
                </tr>
                {editions.map(edition => (
                  <tr key={edition.year}>
                    <td style={s.tdNum}>{edition.number}ª</td>
                    <td style={s.td}>{edition.year}</td>
                    <td style={edition.theme ? s.td : { ...s.td, ...s.tdMuted }}>
                      {edition.theme ??
                        (EDITION_THEMES[edition.year] === null
                          ? "tema ainda não registrado"
                          : "sem tema definido")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.next}>
            <strong>Próxima caminhada: {NEXT_EDITION.date}.</strong> Será a{" "}
            {NEXT_EDITION.number}ª edição do Caminho do Perdão.
          </div>
        </div>
      </div>
    </>
  );
};

export default MedalhasPage;
