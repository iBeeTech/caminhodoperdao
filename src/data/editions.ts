/**
 * As edições do Caminho do Perdão: número, ano e tema.
 *
 * A pedra da estrada mostra o NÚMERO da edição (2008 = 1ª, 2026 = 19ª), não o
 * ano abreviado. "23, 24, 25, 26" parecia idade ou dia do mês; "16ª, 17ª" diz o
 * que a pessoa quer saber — quantas caminhadas já houve.
 *
 * ⚠️ Os temas registrados começam em 2024. Ano sem tema a tela diz que não tem,
 * em vez de inventar um: tema de evento religioso não se chuta.
 */

export const FIRST_EDITION_YEAR = 2008;
export const LATEST_EDITION_YEAR = 2026;

/** A próxima edição, ainda por vir. */
export const NEXT_EDITION = {
  year: 2027,
  number: 20,
  /** Data confirmada pelo organizador em 04/08/2026. */
  date: "01/08/2027",
  isoDate: "2027-08-01",
};

/**
 * Temas por ano. Só existe de 2024 em diante.
 *
 * Ano ausente do mapa é ano SEM tema ("sem tema definido" na tela). Ano com
 * `null` é ano que teve tema, mas ninguém informou qual ainda ("tema ainda não
 * registrado"). A tela de medalhas distingue os dois de propósito — não são a
 * mesma coisa, e chutar o tema de um evento religioso não é opção.
 */
export const EDITION_THEMES: Record<number, string | null> = {
  // 2024 e 2025 informados pelo organizador em 05/08/2026. Isto encerra o
  // "PENDENTE" que 2025 carregava desde 04/08/2026, quando a frase chegou pela
  // metade e o ano ficou como null em vez de receber um palpite.
  2024: "Discípulos de Emaús",
  2025: "Peregrinos na Esperança",
  2026: "Maria, caminho seguro que leva a Jesus",
};

export interface Edition {
  year: number;
  /** 1 para 2008, 19 para 2026. */
  number: number;
  theme: string | null;
}

/** Da mais recente para a mais antiga — a ordem em que a página lista. */
export function listEditions(latestYear: number = LATEST_EDITION_YEAR): Edition[] {
  const editions: Edition[] = [];
  for (let year = latestYear; year >= FIRST_EDITION_YEAR; year -= 1) {
    editions.push({
      year,
      number: editionNumber(year),
      theme: EDITION_THEMES[year] ?? null,
    });
  }
  return editions;
}

export function editionNumber(year: number): number {
  return year - FIRST_EDITION_YEAR + 1;
}
