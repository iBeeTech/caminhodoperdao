/**
 * As edições já realizadas do Caminho do Perdão.
 *
 * Existe para que a "estrada" do peregrino e a lista de anos que ele pode
 * declarar saiam do MESMO lugar. Quando estavam separados, a tela mostrava uma
 * quantidade de edições e o servidor aceitava outra — e a divergência só
 * aparecia quando alguém tentava marcar um ano que a API recusava em silêncio.
 *
 * CONFIRMADO pelo organizador em 04/08/2026: **19 edições, de 2008 a 2026, sem
 * pular nenhum ano**. Por isso o intervalo contínuo abaixo é seguro. Se um dia
 * houver um ano sem caminhada, isto tem de virar uma lista explícita de anos —
 * um intervalo passaria a inventar uma edição que não existiu.
 */

export const EDITIONS_UNTIL_2026 = 19;
export const FIRST_EDITION_YEAR = 2026 - EDITIONS_UNTIL_2026 + 1; // 2008

/** Da edição mais recente para a mais antiga — a ordem em que a tela mostra. */
export function listEditionYears(currentYear: number): number[] {
  const years: number[] = [];
  for (let year = currentYear; year >= FIRST_EDITION_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
}

export function isEditionYear(year: number, currentYear: number): boolean {
  return Number.isInteger(year) && year >= FIRST_EDITION_YEAR && year <= currentYear;
}
