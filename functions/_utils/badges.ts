/// <reference types="@cloudflare/workers-types" />
import { FIRST_EDITION_YEAR } from "./editions";

/**
 * Medalhas do peregrino, derivadas dos anos de caminhada.
 *
 * Função PURA de propósito: recebe os anos e devolve as medalhas, sem tocar no
 * banco. Assim a mesma regra vale para o perfil, para o card compartilhável e
 * para qualquer relatório, sem chance de divergirem.
 *
 * ⚠️ Hoje os anos são AUTO-DECLARADOS (ver migration 029): o histórico apurado
 * de 2026 foi arquivado. Nenhuma medalha aqui prova participação — ela reflete
 * o que a pessoa afirmou. A única exceção é **Servo**, concedida pela
 * organização (migration 031).
 *
 * ## As regras (definidas pelo organizador em 04/08/2026)
 *
 * | Conquista | Metal | Quando |
 * |---|---|---|
 * | Peregrino do ano | bronze | toda edição caminhada |
 * | Primeira caminhada | exclusiva | a primeira vez, uma vez na vida |
 * | 5, 10, 15... caminhadas | prata | a cada bloco de 5 |
 * | 10, 20, 30... caminhadas | ouro | a cada bloco de 10 |
 * | Veterano | exclusiva | 5 caminhadas |
 * | Jubileu | exclusiva | 25 caminhadas |
 * | Fundador | exclusiva | caminhou na 1ª edição |
 * | Servo | exclusiva | concedida pela organização |
 *
 * Prata e ouro **acumulam**: quem tem 20 caminhadas fica com 4 pratas e 2
 * ouros. É de propósito — a pessoa vê a coleção crescer, e não um número
 * trocando de lugar. Foi por isso que a medalha "Nª caminhada" saiu: ela era
 * uma só, mudava de nome todo ano e não somava nada à coleção.
 */

/**
 * Metal ou cor exclusiva.
 *
 * As quatro últimas existem para que conquista rara NÃO se pareça com conquista
 * comum. Quando Fundador e Servo eram douradas iguais às de 10 anos, a raridade
 * sumia no meio da fileira.
 */
export type BadgeTier =
  | "bronze"
  | "prata"
  | "ouro"
  | "primeira"
  | "veterano"
  | "fundador"
  | "servo"
  | "jubileu";

export interface Badge {
  id: string;
  label: string;
  description: string;
  tier: BadgeTier;
  /** Ano da medalha; ausente nos selos que não são de um ano específico. */
  year?: number;
  /** O que vai no centro do medalhão quando não há ano. */
  symbol?: string;
}

/** A cada quantas caminhadas nasce cada metal. */
const SILVER_EVERY = 5;
const GOLD_EVERY = 10;
/** O grande marco. 25 caminhadas é meia vida do evento. */
const JUBILEE_YEARS = 25;
const VETERAN_YEARS = 5;

export interface BadgeContext {
  /** Marcado como servo pela organização (migration 031). */
  isStaff?: boolean;
}

export function buildBadges(
  years: readonly number[],
  context: BadgeContext = {}
): Badge[] {
  // Servo é o único selo com LASTRO: não é auto-declarado, foi a organização
  // que marcou. Por isso vale mesmo para quem ainda não declarou ano nenhum —
  // e por isso é calculado antes da porta de saída logo abaixo.
  const staffBadge: Badge[] = context.isStaff
    ? [
        {
          id: "servo",
          label: "Servo",
          description: "Você serve o Caminho do Perdão junto com a organização.",
          tier: "servo",
          symbol: "✚",
        },
      ]
    : [];

  // Sem anos, sem medalha. Devolver uma medalha "vazia" faria a tela mostrar
  // conquista para quem ainda não caminhou.
  if (years.length === 0) return staffBadge;

  const unique = Array.from(new Set(years)).sort((a, b) => b - a);
  const count = unique.length;

  // Uma de bronze por edição.
  const badges: Badge[] = unique.map(year => ({
    id: `ano-${year}`,
    label: `Peregrino ${year}`,
    description: `Você caminhou na edição de ${year}.`,
    tier: "bronze",
    year,
  }));

  badges.push({
    id: "primeira",
    label: "Primeira caminhada",
    description: "Toda caminhada começa com um primeiro passo.",
    tier: "primeira",
    symbol: "1",
  });

  // Prata a cada 5, ouro a cada 10. Acumulam: 20 caminhadas = 4 pratas e 2
  // ouros, e a coleção cresce em vez de um número trocar de lugar.
  for (let mark = SILVER_EVERY; mark <= count; mark += SILVER_EVERY) {
    badges.push({
      id: `prata-${mark}`,
      label: `${mark} caminhadas`,
      description: `Você completou ${mark} edições do Caminho do Perdão.`,
      tier: "prata",
      symbol: String(mark),
    });
  }

  for (let mark = GOLD_EVERY; mark <= count; mark += GOLD_EVERY) {
    badges.push({
      id: `ouro-${mark}`,
      label: `${mark} caminhadas`,
      description: `Marco de ${mark} edições. O caminho já é história sua.`,
      tier: "ouro",
      symbol: String(mark),
    });
  }

  if (count >= VETERAN_YEARS) {
    badges.push({
      id: "veterano",
      label: "Veterano",
      description: `${VETERAN_YEARS} caminhadas. Você conhece o caminho de cor.`,
      tier: "veterano",
      symbol: "✦",
    });
  }

  if (count >= JUBILEE_YEARS) {
    badges.push({
      id: "jubileu",
      label: "Jubileu",
      description: `${JUBILEE_YEARS} caminhadas. Uma vida inteira no caminho.`,
      tier: "jubileu",
      symbol: "★",
    });
  }

  // Fundador não depende de quantidade: ou a pessoa esteve na primeira edição,
  // ou não esteve.
  if (unique.includes(FIRST_EDITION_YEAR)) {
    badges.push({
      id: "fundador",
      label: "Fundador",
      description: `Você caminhou na primeira edição, em ${FIRST_EDITION_YEAR}.`,
      tier: "fundador",
      symbol: "✝",
    });
  }

  return [...badges, ...staffBadge];
}

export interface NextBadge {
  years: number;
  label: string;
  description: string;
  tier: BadgeTier;
}

/**
 * A próxima medalha a perseguir, para a tela mostrar apagada.
 *
 * É sempre o próximo bloco de 5, porque é o degrau mais próximo em qualquer
 * ponto da jornada. Quando esse bloco também fecha uma dezena, o que se
 * anuncia é o OURO — prometer prata e entregar ouro junto seria vender menos
 * do que se tem.
 */
export function nextMilestone(walkedCount: number): NextBadge | null {
  if (walkedCount >= JUBILEE_YEARS) return null;

  const nextMark = (Math.floor(walkedCount / SILVER_EVERY) + 1) * SILVER_EVERY;

  if (nextMark === JUBILEE_YEARS) {
    return {
      years: JUBILEE_YEARS,
      label: "Jubileu",
      description: `${JUBILEE_YEARS} caminhadas. Uma vida inteira no caminho.`,
      tier: "jubileu",
    };
  }
  if (nextMark % GOLD_EVERY === 0) {
    return {
      years: nextMark,
      label: `${nextMark} caminhadas`,
      description: `Marco de ${nextMark} edições, em ouro.`,
      tier: "ouro",
    };
  }
  return {
    years: nextMark,
    label: `${nextMark} caminhadas`,
    description: `Bloco de ${nextMark} edições, em prata.`,
    tier: "prata",
  };
}
