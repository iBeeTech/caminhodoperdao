/// <reference types="@cloudflare/workers-types" />

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

export interface Badge {
  id: string;
  label: string;
  description: string;
  /** Ano da medalha; ausente nos selos que não são de um ano específico. */
  year?: number;
}

/** A partir de quantos anos cada selo de constância aparece. */
const VETERAN_YEARS = 3;
const DEVOTED_YEARS = 5;

export function buildBadges(years: readonly number[]): Badge[] {
  // Sem anos, sem medalha. Devolver uma medalha "vazia" faria a tela mostrar
  // conquista para quem ainda não caminhou.
  if (years.length === 0) return [];

  const unique = Array.from(new Set(years)).sort((a, b) => b - a);
  const badges: Badge[] = unique.map(year => ({
    id: `ano-${year}`,
    label: `Peregrino ${year}`,
    description: `Você caminhou na edição de ${year}.`,
    year,
  }));

  badges.push({
    id: "caminhadas",
    label: unique.length === 1 ? "Primeira caminhada" : `${unique.length}ª caminhada`,
    description:
      unique.length === 1
        ? "Toda caminhada começa com um primeiro passo."
        : `Você já caminhou ${unique.length} vezes.`,
  });

  if (unique.length >= DEVOTED_YEARS) {
    badges.push({
      id: "devoto",
      label: "Peregrino de coração",
      description: `${DEVOTED_YEARS} edições ou mais. O caminho já é parte de você.`,
    });
  } else if (unique.length >= VETERAN_YEARS) {
    badges.push({
      id: "veterano",
      label: "Veterano",
      description: `${VETERAN_YEARS} edições ou mais.`,
    });
  }

  return badges;
}
