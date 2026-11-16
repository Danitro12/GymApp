// ─── Texto tabular → filas ────────────────────────────────────────────────────
// Acepta lo que se suele pegar: celdas copiadas de Excel/Sheets (tabuladores),
// CSV con coma o punto y coma, y tablas Markdown (| a | b |).

const isMarkdownSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

const parseMarkdown = (lines) => lines
  .filter((l) => l.trim().startsWith('|') && !isMarkdownSeparator(l))
  .map((l) => {
    let s = l.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim().replace(/^\*\*(.*)\*\*$/, '$1'));
  });

const parseDelimited = (text, delim) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      inQuotes = true;
      cell = '';
    } else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
};

export const textToRows = (text) => {
  const clean = String(text || '').replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  if (lines.filter((l) => l.trim().startsWith('|')).length >= 2) return parseMarkdown(lines);

  const sample = lines.slice(0, 5).join('\n');
  const counts = ['\t', ';', ','].map((d) => [d, sample.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  const delim = counts[0][1] > 0 ? counts[0][0] : '\t';
  return parseDelimited(lines.join('\n'), delim).filter((r) => r.some((c) => c !== ''));
};
