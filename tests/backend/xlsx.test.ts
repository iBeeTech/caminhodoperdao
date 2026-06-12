import { describe, it, expect } from "vitest";
import { buildXlsx, xlsxResponse } from "../../functions/_utils/xlsx";

// Lê um ZIP no método STORE (sem compressão) extraindo cada arquivo pelos
// cabeçalhos locais. Suficiente para validar a saída do nosso gerador de .xlsx.
function unzipStore(bytes: Uint8Array): Map<string, string> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();

  // Localiza o End Of Central Directory (assinatura 0x06054b50), sem comentário.
  const eocd = bytes.length - 22;
  expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
  const entryCount = dv.getUint16(eocd + 10, true);
  let cdOffset = dv.getUint32(eocd + 16, true);

  for (let i = 0; i < entryCount; i++) {
    expect(dv.getUint32(cdOffset, true)).toBe(0x02014b50);
    const compSize = dv.getUint32(cdOffset + 20, true);
    const nameLen = dv.getUint16(cdOffset + 28, true);
    const extraLen = dv.getUint16(cdOffset + 30, true);
    const commentLen = dv.getUint16(cdOffset + 32, true);
    const localOffset = dv.getUint32(cdOffset + 42, true);
    const name = decoder.decode(bytes.slice(cdOffset + 46, cdOffset + 46 + nameLen));

    // Cabeçalho local: dados começam após nome + extra do header local.
    expect(dv.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const localExtraLen = dv.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = bytes.slice(dataStart, dataStart + compSize);
    files.set(name, decoder.decode(data));

    cdOffset += 46 + nameLen + extraLen + commentLen;
  }

  return files;
}

describe("buildXlsx", () => {
  it("produz um pacote .xlsx com todas as partes obrigatórias", () => {
    const bytes = buildXlsx({
      sheetName: "Teste",
      rows: [
        [{ value: "NOME", style: { bold: true, fill: "F0F0F0" } }, "VALOR"],
        ["Maria", 42],
      ],
    });

    const files = unzipStore(bytes);
    expect([...files.keys()].sort()).toEqual(
      [
        "[Content_Types].xml",
        "_rels/.rels",
        "xl/_rels/workbook.xml.rels",
        "xl/styles.xml",
        "xl/workbook.xml",
        "xl/worksheets/sheet1.xml",
      ].sort()
    );
  });

  it("escreve strings como inlineStr e números como valor numérico", () => {
    const bytes = buildXlsx({
      sheetName: "Dados",
      rows: [["Maria", 42]],
    });
    const sheet = unzipStore(bytes).get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain('<t xml:space="preserve">Maria</t>');
    expect(sheet).toContain("<v>42</v>");
  });

  it("registra negrito, cor de fonte e preenchimento nos estilos", () => {
    const bytes = buildXlsx({
      sheetName: "Estilos",
      rows: [
        [{ value: "x", style: { bold: true, color: "C62828" } }],
        [{ value: "y", style: { fill: "F0F0F0" } }],
      ],
    });
    const styles = unzipStore(bytes).get("xl/styles.xml")!;

    expect(styles).toContain("<b/>");
    expect(styles).toContain('rgb="FFC62828"');
    expect(styles).toContain('rgb="FFF0F0F0"');
  });

  it("escapa caracteres especiais de XML no conteúdo das células", () => {
    const bytes = buildXlsx({
      sheetName: "Escape",
      rows: [["A & B < C > D \" '"]],
    });
    const sheet = unzipStore(bytes).get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain("A &amp; B &lt; C &gt; D &quot; &#39;");
  });

  it("expõe o cabeçalho e o nome de arquivo corretos via xlsxResponse", () => {
    const res = xlsxResponse({ sheetName: "R", rows: [["a"]] }, "relatorio.xlsx");

    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="relatorio.xlsx"'
    );
  });
});
