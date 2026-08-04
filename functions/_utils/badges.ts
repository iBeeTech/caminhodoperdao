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
 * o que a pessoa afirmou.
 *
 * Ficam de fora, por enquanto, os selos que dependem de dado que a declaração
 * não carrega: Servo (staff), Mosteiro, Semeador (convidou alguém) e Testemunha.
 * Voltam quando houver inscrição de verdade no ano, com lastro.
 */

/** Metal da medalha. É só apresentação, mas mora aqui para não divergir. */
export type BadgeTier = "bronze" | "prata" | "ouro";

export interface Badge {
  id: string;
  label: string;
  description: string;
  tier: BadgeTier;
  /** Ano da medalha; ausente nos selos que não são de um ano específico. */
  year?: number;
}

/**
 * Os degraus de constância, do menor para o maior.
 *
 * Lista em vez de `if` encadeado porque a tela também precisa deles: é com esta
 * lista que ela mostra a PRÓXIMA medalha, ainda apagada. Um `if` no servidor
 * obrigaria a tela a repetir os números — e a repetição sempre desanda.
 */
export const MILESTONES: { years: number; label: string; description: string; tier: BadgeTier }[] =
  [
    {
      years: 3,
      label: "Veterano",
      description: "3 edições ou mais.",
      tier: "prata",
    },
    {
      years: 5,
      label: "Peregrino de coração",
      description: "5 edições ou mais. O caminho já é parte de você.",
      tier: "ouro",
    },
    {
      years: 10,
      label: "Guardião do caminho",
      description: "10 edições. Poucos chegam até aqui.",
      tier: "ouro",
    },
  ];

export function buildBadges(years: readonly number[]): Badge[] {
  // Sem anos, sem medalha. Devolver uma medalha "vazia" faria a tela mostrar
  // conquista para quem ainda não caminhou.
  if (years.length === 0) return [];

  const unique = Array.from(new Set(years)).sort((a, b) => b - a);
  const badges: Badge[] = unique.map(year => ({
    id: `ano-${year}`,
    label: `Peregrino ${year}`,
    description: `Você caminhou na edição de ${year}.`,
    tier: "bronze",
    year,
  }));

  badges.push({
    id: "caminhadas",
    label: unique.length === 1 ? "Primeira caminhada" : `${unique.length}ª caminhada`,
    description:
      unique.length === 1
        ? "Toda caminhada começa com um primeiro passo."
        : `Você já caminhou ${unique.length} vezes.`,
    tier: "prata",
  });

  // Fundador é o único selo aqui que não depende de quantidade: ou a pessoa
  // esteve na primeira edição, ou não esteve.
  if (unique.includes(FIRST_EDITION_YEAR)) {
    badges.push({
      id: "fundador",
      label: "Fundador",
      description: `Você caminhou na primeira edição, em ${FIRST_EDITION_YEAR}.`,
      tier: "ouro",
    });
  }

  // Só o degrau mais alto alcançado. Mostrar "Veterano" ao lado de "Peregrino
  // de coração" faria a conquista maior parecer menos.
  const reached = MILESTONES.filter(m => unique.length >= m.years).pop();
  if (reached) {
    badges.push({
      id: `constancia-${reached.years}`,
      label: reached.label,
      description: reached.description,
      tier: reached.tier,
    });
  }

  return badges;
}

/** A próxima medalha de constância, para a tela mostrar apagada. */
export function nextMilestone(walkedCount: number): (typeof MILESTONES)[number] | null {
  return MILESTONES.find(m => walkedCount < m.years) ?? null;
}
