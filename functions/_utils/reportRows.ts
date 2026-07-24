/// <reference types="@cloudflare/workers-types" />
//
// Convenções comuns às planilhas de relatório do admin:
// - a primeira coluna é sempre a enumeração das linhas (1, 2, 3, ...);
// - as listas de pessoas saem em ordem alfabética de nome.
//
import { CellInput, CellStyle } from "./xlsx";

/** Cinza claro usado no fundo do cabeçalho de todas as planilhas. */
export const HEADER_FILL = "F0F0F0";

/** Rótulo da coluna de enumeração. */
export const ROW_NUMBER_HEADER = "Nº";

/** Largura (em caracteres) da coluna de enumeração. */
export const ROW_NUMBER_WIDTH = 6;

const ROW_NUMBER_STYLE = { align: "center" as const };

/**
 * Compara nomes na ordem alfabética do português, ignorando acentos e
 * diferença entre maiúsculas e minúsculas ("Ângela" vem antes de "Bruno").
 */
export function compareByName(a: string | null, b: string | null): number {
  return (a ?? "").localeCompare(b ?? "", "pt-BR", { sensitivity: "base" });
}

/** Cabeçalho da planilha, já com a coluna de enumeração na frente. */
export function numberedHeaderRow(labels: string[]): CellInput[] {
  return [ROW_NUMBER_HEADER, ...labels].map(value => ({
    value,
    style: { bold: true, fill: HEADER_FILL },
  }));
}

/** Prefixa cada linha de dados com a sua posição na planilha. */
export function numberedDataRows(rows: CellInput[][]): CellInput[][] {
  return rows.map((row, index) => [
    { value: index + 1, style: ROW_NUMBER_STYLE },
    ...row,
  ]);
}

/** Larguras de coluna, já com a da enumeração na frente. */
export function numberedColumnWidths(widths: number[]): number[] {
  return [ROW_NUMBER_WIDTH, ...widths];
}

/**
 * Linha de rodapé (totais) alinhada às colunas de dados. A célula da coluna de
 * enumeração fica vazia; `leadingStyle` serve para ela acompanhar o
 * preenchimento do resto do rodapé.
 */
export function footerRow(cells: CellInput[], leadingStyle?: CellStyle): CellInput[] {
  return [{ value: "", style: leadingStyle }, ...cells];
}
