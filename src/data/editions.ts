/**
 * As edições do Caminho do Perdão: número, ano e tema.
 *
 * A pedra da estrada mostra o NÚMERO da edição (2008 = 1ª, 2026 = 19ª), não o
 * ano abreviado. "23, 24, 25, 26" parecia idade ou dia do mês; "16ª, 17ª" diz o
 * que a pessoa quer saber — quantas caminhadas já houve.
 *
 * ⚠️ Os temas só começaram em 2025. Ano sem tema fica com `null` e a tela diz
 * isso, em vez de inventar um: tema de evento religioso não se chuta.
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

/** Temas por ano. Só existe de 2025 em diante. */
export const EDITION_THEMES: Record<number, string | null> = {
  // ⚠️ PENDENTE: o organizador começou a informar e a frase ficou incompleta.
  // Fica `null` de propósito até alguém dizer qual foi — a tela mostra
  // "tema não registrado", que é honesto, em vez de um tema inventado.
  2025: null,
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
