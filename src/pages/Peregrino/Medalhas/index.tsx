import React from "react";
import { Header } from "../../../components";
import Medal from "../components/Medal";
import { theme } from "../../../styles/theme";
import { EDITION_THEMES, NEXT_EDITION, listEditions } from "../../../data/editions";

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

/** Espelho de `functions/_utils/badges.ts`. Mudou lá, muda aqui. */
const CATALOG = [
  {
    id: "ano",
    label: "Peregrino do ano",
    description: "Uma medalha para cada edição em que você caminhou.",
    tier: "bronze" as const,
    how: "Marque o ano no seu perfil.",
  },
  {
    id: "primeira",
    label: "Primeira caminhada",
    description: "Toda caminhada começa com um primeiro passo.",
    tier: "prata" as const,
    how: "Declare a sua primeira edição.",
  },
  {
    id: "contador",
    label: "Nª caminhada",
    description: "Conta quantas edições você já caminhou.",
    tier: "prata" as const,
    how: "Cresce sozinha a cada ano declarado.",
  },
  {
    id: "veterano",
    label: "Veterano",
    description: "3 edições ou mais.",
    tier: "prata" as const,
    how: "Declare 3 anos.",
  },
  {
    id: "devoto",
    label: "Peregrino de coração",
    description: "5 edições ou mais. O caminho já é parte de você.",
    tier: "ouro" as const,
    how: "Declare 5 anos.",
  },
  {
    id: "guardiao",
    label: "Guardião do caminho",
    description: "10 edições. Poucos chegam até aqui.",
    tier: "ouro" as const,
    how: "Declare 10 anos.",
  },
  {
    id: "fundador",
    label: "Fundador",
    description: "Você caminhou na primeira edição, em 2008.",
    tier: "ouro" as const,
    how: "Declare o ano de 2008.",
  },
  {
    id: "servo",
    label: "Servo",
    description: "Você serve o Caminho do Perdão junto com a organização.",
    tier: "ouro" as const,
    how: "Concedida pela organização — é a única que não é auto-declarada.",
  },
];

const MedalhasPage: React.FC = () => {
  const editions = listEditions();

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
            Só a medalha de <strong>Servo</strong> é concedida pela organização. As outras
            saem do que você mesmo declara — não temos como conferir, então conte com
            sinceridade.
          </p>

          <div style={s.showcase}>
            {CATALOG.map(badge => (
              <Medal
                key={badge.id}
                label={badge.label}
                description={badge.description}
                tier={badge.tier}
              />
            ))}
          </div>

          <div style={s.scroller}>
            <table style={{ ...s.table, marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={s.th}>Medalha</th>
                  <th style={s.th}>Metal</th>
                  <th style={s.th}>Como conquistar</th>
                </tr>
              </thead>
              <tbody>
                {CATALOG.map(badge => (
                  <tr key={badge.id}>
                    <td style={{ ...s.td, fontWeight: 700 }}>{badge.label}</td>
                    <td style={s.td}>{badge.tier}</td>
                    <td style={s.td}>{badge.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={s.sectionTitle}>Os temas de cada edição</h2>
          <p style={s.sectionHelp}>
            Os temas começaram em 2025. As edições anteriores não tiveram tema definido.
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
