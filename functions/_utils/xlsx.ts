/// <reference types="@cloudflare/workers-types" />
//
// Gera arquivos .xlsx (Office Open XML / SpreadsheetML) REAIS, sem dependências.
//
// Por que não servir HTML disfarçado de .xls: o Excel/LibreOffice no desktop
// é tolerante e abre, mas os apps de planilha no celular (Google Sheets, Excel
// mobile, visualizadores do Android/iOS) validam o formato e rejeitam o arquivo
// como "corrompido". Um .xlsx de verdade abre em qualquer lugar.
//
// Por que não usar lib externa (SheetJS/ExcelJS): este código roda no Cloudflare
// Workers. ExcelJS depende de APIs do Node e o SheetJS open-source não escreve
// estilos (cores/negrito). Um ZIP no método STORE + CRC32 em JS puro é simples,
// não tem dependências e funciona garantidamente no runtime de Workers.

export interface CellStyle {
  bold?: boolean;
  /** Cor da fonte em hex "RRGGBB" (sem #). */
  color?: string;
  /** Cor de fundo (preenchimento) em hex "RRGGBB" (sem #). */
  fill?: string;
  align?: "left" | "center" | "right";
}

export type CellValue = string | number;

export interface Cell {
  value: CellValue;
  style?: CellStyle;
}

/** Uma célula pode ser um objeto {value, style} ou direto uma string/número. */
export type CellInput = Cell | CellValue;

export interface SheetSpec {
  sheetName: string;
  rows: CellInput[][];
  /** Largura por coluna (em caracteres). Se ausente, é calculada automaticamente. */
  columnWidths?: number[];
}

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Monta uma Response pronta para download de um .xlsx. */
export function xlsxResponse(spec: SheetSpec, filename: string): Response {
  const body = buildXlsx(spec);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Gera o conteúdo binário de um arquivo .xlsx com uma única planilha. */
export function buildXlsx(spec: SheetSpec): Uint8Array {
  const rows: Cell[][] = spec.rows.map(row => row.map(normalizeCell));
  const { styleMap, styles } = buildStyleRegistry(rows);
  const widths =
    spec.columnWidths && spec.columnWidths.length
      ? spec.columnWidths
      : autoColumnWidths(rows);

  const sheet = buildSheetXml(rows, widths, styleMap);
  const stylesDoc = buildStylesXml(styles);
  const sheetName = sanitizeSheetName(spec.sheetName);

  const enc = new TextEncoder();
  const files: ZipEntry[] = [
    { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES_XML) },
    { name: "_rels/.rels", data: enc.encode(ROOT_RELS_XML) },
    { name: "xl/workbook.xml", data: enc.encode(buildWorkbookXml(sheetName)) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(WORKBOOK_RELS_XML) },
    { name: "xl/styles.xml", data: enc.encode(stylesDoc) },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheet) },
  ];
  return zipStore(files);
}

// --- Normalização e helpers de estilo -------------------------------------

function normalizeCell(input: CellInput): Cell {
  if (input !== null && typeof input === "object" && "value" in input) {
    return input as Cell;
  }
  return { value: input as CellValue };
}

function styleKey(style: CellStyle | undefined): string {
  if (!style) return "";
  return `${style.bold ? 1 : 0}|${style.color ?? ""}|${style.fill ?? ""}|${style.align ?? ""}`;
}

interface StyleRegistry {
  /** Mapa: chave de estilo -> índice na lista de cellXfs. */
  styleMap: Map<string, number>;
  /** Estilos distintos, na ordem dos índices (0 = estilo padrão). */
  styles: CellStyle[];
}

function buildStyleRegistry(rows: Cell[][]): StyleRegistry {
  const styleMap = new Map<string, number>();
  const styles: CellStyle[] = [{}];
  styleMap.set("", 0);

  for (const row of rows) {
    for (const cell of row) {
      const key = styleKey(cell.style);
      if (!styleMap.has(key)) {
        styleMap.set(key, styles.length);
        styles.push(cell.style ?? {});
      }
    }
  }
  return { styleMap, styles };
}

function autoColumnWidths(rows: Cell[][]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, c) => {
      const len = String(cell.value ?? "").length;
      const candidate = Math.min(len + 2, 60);
      widths[c] = Math.max(widths[c] ?? 8, candidate);
    });
  }
  return widths;
}

// --- Geração do XML --------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function columnLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return cleaned || "Planilha";
}

function buildSheetXml(
  rows: Cell[][],
  widths: number[],
  styleMap: Map<string, number>
): string {
  const rowsXml = rows
    .map((row, r) => {
      const rowNum = r + 1;
      const cellsXml = row
        .map((cell, c) => {
          const ref = columnLetter(c) + rowNum;
          const sIdx = styleMap.get(styleKey(cell.style)) ?? 0;
          const sAttr = sIdx ? ` s="${sIdx}"` : "";

          if (typeof cell.value === "number" && Number.isFinite(cell.value)) {
            return `<c r="${ref}"${sAttr}><v>${cell.value}</v></c>`;
          }
          const text = String(cell.value ?? "");
          if (text === "") return `<c r="${ref}"${sAttr}/>`;
          return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const colsXml = widths.length
    ? `<cols>${widths
        .map(
          (w, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`
        )
        .join("")}</cols>`
    : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    colsXml +
    `<sheetData>${rowsXml}</sheetData>` +
    "</worksheet>"
  );
}

function buildStylesXml(styles: CellStyle[]): string {
  // Fontes: dedup por (bold, color). Índice 0 = fonte padrão.
  const fontKey = (s: CellStyle) => `${s.bold ? 1 : 0}|${s.color ?? ""}`;
  const fontMap = new Map<string, number>();
  const fonts: Array<{ bold: boolean; color?: string }> = [{ bold: false }];
  fontMap.set("0|", 0);

  // Preenchimentos: índices 0 (none) e 1 (gray125) são reservados pelo formato.
  const fillMap = new Map<string, number>();
  const fillColors: string[] = [];

  const xfDefs = styles.map(style => {
    const fk = fontKey(style);
    let fontId = fontMap.get(fk);
    if (fontId === undefined) {
      fontId = fonts.length;
      fontMap.set(fk, fontId);
      fonts.push({ bold: !!style.bold, color: style.color });
    }

    let fillId = 0;
    if (style.fill) {
      let id = fillMap.get(style.fill);
      if (id === undefined) {
        id = 2 + fillColors.length;
        fillMap.set(style.fill, id);
        fillColors.push(style.fill);
      }
      fillId = id;
    }

    return { fontId, fillId, align: style.align };
  });

  const fontsXml = fonts
    .map(f => {
      const bold = f.bold ? "<b/>" : "";
      const color = f.color ? `<color rgb="FF${f.color}"/>` : "";
      return `<font>${bold}<sz val="11"/>${color}<name val="Calibri"/></font>`;
    })
    .join("");

  const fillsXml =
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    fillColors
      .map(
        color =>
          `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`
      )
      .join("");
  const fillsCount = 2 + fillColors.length;

  // Borda 0 = nenhuma; borda 1 = fina em todos os lados (aplicada a toda célula).
  const bordersXml =
    "<border/>" +
    '<border><left style="thin"><color indexed="64"/></left>' +
    '<right style="thin"><color indexed="64"/></right>' +
    '<top style="thin"><color indexed="64"/></top>' +
    '<bottom style="thin"><color indexed="64"/></bottom><diagonal/></border>';

  const cellXfsXml = xfDefs
    .map(x => {
      const applyFont = x.fontId ? ' applyFont="1"' : "";
      const applyFill = x.fillId ? ' applyFill="1"' : "";
      const applyAlign = x.align ? ' applyAlignment="1"' : "";
      const alignXml = x.align ? `<alignment horizontal="${x.align}"/>` : "";
      return `<xf numFmtId="0" fontId="${x.fontId}" fillId="${x.fillId}" borderId="1" xfId="0" applyBorder="1"${applyFont}${applyFill}${applyAlign}>${alignXml}</xf>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<fonts count="${fonts.length}">${fontsXml}</fonts>` +
    `<fills count="${fillsCount}">${fillsXml}</fills>` +
    `<borders count="2">${bordersXml}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfDefs.length}">${cellXfsXml}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>"
  );
}

function buildWorkbookXml(sheetName: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>"
  );
}

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  "</Types>";

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

// --- ZIP (método STORE, sem compressão) + CRC32 ----------------------------

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Data/hora fixas (1980-01-01 00:00) para um pacote determinístico.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

function zipStore(files: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, DOS_TIME, true);
    lv.setUint16(12, DOS_DATE, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, DOS_TIME, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + size;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const centralOffset = offset;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);

  const all = [...localParts, ...centralParts, eocd];
  const total = all.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const part of all) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}
