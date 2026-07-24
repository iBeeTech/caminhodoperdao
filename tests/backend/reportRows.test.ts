import { describe, it, expect } from "vitest";
import {
  compareByName,
  footerRow,
  numberedColumnWidths,
  numberedDataRows,
  numberedHeaderRow,
  ROW_NUMBER_HEADER,
  ROW_NUMBER_WIDTH,
} from "../../functions/_utils/reportRows";
import { CellInput } from "../../functions/_utils/xlsx";

// Extrai o valor bruto de uma célula ({value, style} ou string/número direto).
function valueOf(cell: CellInput): string | number {
  if (cell !== null && typeof cell === "object" && "value" in cell) {
    return cell.value;
  }
  return cell;
}

describe("compareByName", () => {
  it("ordena ignorando acentos e maiúsculas", () => {
    const names = ["Zeca", "bruno", "Ângela", "Ana", "Álvaro"];
    const sorted = [...names].sort(compareByName);
    expect(sorted).toEqual(["Álvaro", "Ana", "Ângela", "bruno", "Zeca"]);
  });

  it("trata nome nulo como string vazia, sem quebrar", () => {
    const sorted = ["Bruno", null, "Ana"].sort(compareByName);
    expect(sorted).toEqual([null, "Ana", "Bruno"]);
  });
});

describe("numberedHeaderRow", () => {
  it("põe a coluna de enumeração na frente e mantém o resto", () => {
    const header = numberedHeaderRow(["NOME", "CPF"]);
    expect(header.map(valueOf)).toEqual([ROW_NUMBER_HEADER, "NOME", "CPF"]);
  });
});

describe("numberedDataRows", () => {
  it("numera as linhas a partir de 1", () => {
    const rows = numberedDataRows([["Ana"], ["Bruno"], ["Zeca"]]);
    expect(rows.map(row => valueOf(row[0]))).toEqual([1, 2, 3]);
    expect(rows.map(row => valueOf(row[1]))).toEqual(["Ana", "Bruno", "Zeca"]);
  });

  it("não numera nada quando não há dados", () => {
    expect(numberedDataRows([])).toEqual([]);
  });
});

describe("alinhamento das colunas", () => {
  it("cabeçalho, dados e rodapé têm o mesmo número de colunas", () => {
    const labels = ["NOME", "CPF", "VALOR"];
    const totals: CellInput[] = ["", "TOTAL", "R$ 10,00"];

    const header = numberedHeaderRow(labels);
    const [dataRow] = numberedDataRows([["Ana", "000", "R$ 10,00"]]);
    const footer = footerRow(totals);

    expect(dataRow.length).toBe(header.length);
    expect(footer.length).toBe(header.length);
    // O rodapé não é numerado: a primeira célula fica vazia.
    expect(valueOf(footer[0])).toBe("");
    expect(valueOf(footer[2])).toBe("TOTAL");
  });

  it("as larguras acompanham as colunas do cabeçalho", () => {
    const labels = ["NOME", "CPF"];
    const widths = numberedColumnWidths([28, 16]);
    expect(widths).toEqual([ROW_NUMBER_WIDTH, 28, 16]);
    expect(widths.length).toBe(numberedHeaderRow(labels).length);
  });
});
