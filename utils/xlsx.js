// ─── Lectura/escritura mínima de .xlsx ────────────────────────────────────────
// Un .xlsx es un zip con XML dentro. Generamos solo lo necesario (varias hojas,
// texto, números, fechas, cabecera en negrita, filtros y anchos de columna) y
// leemos celdas de texto/número. Funciona igual en web y en React Native.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

// ── Utilidades ──
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const escapeXml = (s) => String(s)
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const decodeXml = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

export const colName = (index) => {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const colIndex = (letters) => {
  let n = 0;
  for (let i = 0; i < letters.length; i += 1) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
};

// Fecha local → número de serie de Excel (días desde 1899-12-30).
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const toExcelDate = (d) => {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  return (utc - EXCEL_EPOCH) / 86400000;
};

const safeSheetName = (name, used) => {
  let base = String(name || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

// Estilos: 0 normal · 1 cabecera · 2 fecha · 3 fecha+hora · 4 decimal
const STYLES_XML = `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="166" formatCode="0.##"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF88E42"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// Marca para escribir una fecha con hora (por defecto, solo fecha).
export const dateTime = (date) => ({ __dateTime: date });

const cellXml = (ref, value, isHeader) => {
  if (value === null || value === undefined || value === '') return '';
  if (isHeader) {
    return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  }
  if (value && value.__dateTime instanceof Date) {
    return `<c r="${ref}" s="3"><v>${toExcelDate(value.__dateTime)}</v></c>`;
  }
  if (value instanceof Date) {
    return `<c r="${ref}" s="2"><v>${Math.floor(toExcelDate(value))}</v></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const style = Number.isInteger(value) ? '' : ' s="4"';
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const sheetXml = ({ rows = [], colWidths = [], header = true }) => {
  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const cols = colWidths.length
    ? `<cols>${colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const body = rows.map((row, r) => {
    const cells = row.map((v, c) => cellXml(`${colName(c)}${r + 1}`, v, header && r === 0)).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const views = header && rows.length > 1
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = header && rows.length > 1 && maxCols > 0
    ? `<autoFilter ref="A1:${colName(maxCols - 1)}${rows.length}"/>`
    : '';
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${views}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData>${filter}</worksheet>`;
};

/**
 * Crea un .xlsx.
 * @param {Array<{name: string, rows: any[][], colWidths?: number[], header?: boolean}>} sheets
 * @returns {Uint8Array}
 */
export const writeXlsx = (sheets) => {
  const used = new Set();
  const named = sheets.map((s) => ({ ...s, name: safeSheetName(s.name, used) }));
  const files = {
    '[Content_Types].xml': strToU8(`${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    '_rels/.rels': strToU8(`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${named.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${named.some((s) => s.header !== false && s.rows.length > 1) ? `<definedNames>${named.map((s, i) => {
      if (s.header === false || s.rows.length < 2) return '';
      const maxCols = s.rows.reduce((m, r) => Math.max(m, r.length), 0);
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${escapeXml(s.name.replace(/'/g, "''"))}'!$A$1:$${colName(maxCols - 1)}$${s.rows.length}</definedName>`;
    }).join('')}</definedNames>` : ''}</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES_XML),
  };
  named.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files, { level: 6 });
};

// ── Lectura ──
const attr = (attrs, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
};

const textOf = (xml) => {
  const parts = [];
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) parts.push(decodeXml(m[1]));
  return parts.join('');
};

const readSheetRows = (xml, shared) => {
  const rows = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g;
  let rm;
  let implicitRow = 0;
  while ((rm = rowRe.exec(xml))) {
    const rowAttrs = rm[1] || rm[3] || '';
    const rAttr = attr(rowAttrs, 'r');
    const rowIdx = rAttr ? parseInt(rAttr, 10) - 1 : implicitRow;
    implicitRow = rowIdx + 1;
    const out = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    let implicitCol = 0;
    while ((cm = cellRe.exec(rm[2] || ''))) {
      const cAttrs = cm[1];
      const inner = cm[2] || '';
      const ref = attr(cAttrs, 'r');
      const col = ref ? colIndex(ref.replace(/\d+/g, '')) : implicitCol;
      implicitCol = col + 1;
      const type = attr(cAttrs, 't');
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
      const raw = vMatch ? decodeXml(vMatch[1]) : null;
      let value = '';
      if (type === 's') value = shared[parseInt(raw, 10)] ?? '';
      else if (type === 'inlineStr') value = textOf(inner);
      else if (type === 'b') value = raw === '1';
      else if (type === 'str' || type === 'e') value = raw ?? '';
      else if (raw !== null && raw !== '') value = Number(raw);
      out[col] = value;
    }
    for (let i = 0; i < out.length; i += 1) if (out[i] === undefined) out[i] = '';
    rows[rowIdx] = out;
  }
  for (let i = 0; i < rows.length; i += 1) if (!rows[i]) rows[i] = [];
  return rows;
};

/**
 * Lee un .xlsx y devuelve [{ name, rows }] en el orden de las hojas.
 * @param {Uint8Array} bytes
 */
export const readXlsx = (bytes) => {
  const files = unzipSync(bytes);
  const get = (path) => (files[path] ? strFromU8(files[path]) : null);
  const workbook = get('xl/workbook.xml');
  if (!workbook) throw new Error('Not an xlsx file');

  const rels = {};
  const relXml = get('xl/_rels/workbook.xml.rels') || '';
  const relRe = /<Relationship\b([^>]*)\/?>/g;
  let m;
  while ((m = relRe.exec(relXml))) {
    const id = attr(m[1], 'Id');
    const target = attr(m[1], 'Target');
    if (id && target) rels[id] = target.replace(/^\/?xl\//, '').replace(/^\//, '');
  }

  const shared = [];
  const sst = get('xl/sharedStrings.xml');
  if (sst) {
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    while ((m = siRe.exec(sst))) shared.push(textOf(m[1]));
  }

  const sheets = [];
  const sheetRe = /<sheet\b([^>]*)\/?>/g;
  while ((m = sheetRe.exec(workbook))) {
    const name = decodeXml(attr(m[1], 'name') || `Sheet${sheets.length + 1}`);
    const rid = attr(m[1], 'r:id');
    const path = rid && rels[rid] ? `xl/${rels[rid]}` : `xl/worksheets/sheet${sheets.length + 1}.xml`;
    const xml = get(path);
    if (xml) sheets.push({ name, rows: readSheetRows(xml, shared) });
  }
  return sheets;
};
