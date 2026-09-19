import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedData } from '../../types/credit';
import { isBRDSchedule, parseBRDSchedule } from './brdPdfParser';
import { parseBRDColumns, getLastPivotDiag, PAGE_SENTINEL } from './brdPivotParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Valorile dintr-o coloana BRD pot fi desenate la cativa pixeli sub restul
// coloanei; rotunjirea Y la 8px le imparte in doua linii si parserul pivot
// (care cere coloane cu numar fix de valori) le abandoneaza in tacere.
const Y_MERGE_TOL = 6;
const TABULAR_TOKEN_RE = /^(?:\d{2}[\/.]\d{2}[\/.]\d{4}|(?=.*\d)[\d.,()\-+]+)$/;

type LineItem = { str: string; x: number; rawY: number };

function isTabularLine(items: LineItem[]): boolean {
  return items.length > 0 && items.every(it => TABULAR_TOKEN_RE.test(it.str));
}

export async function parsePDF(arrayBuffer: ArrayBuffer): Promise<ParsedData> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages === 0) {
    throw new Error('PDF-ul nu conține pagini.');
  }

  const allTextLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group items by Y coordinate with generous tolerance
    const itemsByY = new Map<number, LineItem[]>();

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;

      // Round Y to nearest 8px to group items on the same visual line
      const y = Math.round(item.transform[5] / 8) * 8;
      const x = item.transform[4];
      const str = item.str.trim();

      if (!itemsByY.has(y)) {
        itemsByY.set(y, []);
      }
      itemsByY.get(y)!.push({ str, x, rawY: item.transform[5] });
    }

    // Sort by Y (top to bottom), then X (left to right)
    const buckets = Array.from(itemsByY.entries())
      .map(([, items]) => ({
        items: items.sort((a, b) => a.x - b.x),
        yTop: Math.max(...items.map(i => i.rawY)),
        yBot: Math.min(...items.map(i => i.rawY)),
      }))
      .sort((a, b) => b.yTop - a.yTop);

    // O linie vizuala trebuie sa ramana o singura linie de text: fragmentele
    // tabulare apropiate sunt aceeasi linie desenata in doua transe de Y.
    let bi = 0;
    while (bi < buckets.length - 1) {
      const above = buckets[bi];
      const below = buckets[bi + 1];
      if (
        above.yBot - below.yTop <= Y_MERGE_TOL &&
        isTabularLine(above.items) &&
        isTabularLine(below.items)
      ) {
        above.items = [...above.items, ...below.items].sort((a, b) => a.x - b.x);
        above.yBot = below.yBot;
        buckets.splice(bi + 1, 1);
      } else {
        bi++;
      }
    }

    for (const bucket of buckets) {
      const lineText = bucket.items.map(it => it.str).join(' ');
      if (lineText.trim()) {
        allTextLines.push(lineText.trim());
      }
    }

    // Delimitator de pagina pentru parserul pivot BRD (granita dura de bloc).
    if (i < pdf.numPages) {
      allTextLines.push(PAGE_SENTINEL);
    }
  }

  if (allTextLines.length === 0) {
    throw new Error(
      'Acest PDF pare să fie scanat. Încearcă să încarci un fișier Excel sau CSV.'
    );
  }

  // Ramura BRD (Grafic costuri totale): doua strategii complementare —
  // pe randuri (text curat) si pivot pe coloane (extractie pdfjs
  // coloana-cu-coloana). Se pastreaza care recupereaza mai multe randuri.
  if (isBRDSchedule(allTextLines)) {
    let viaStream: ParsedData | null = null;
    try {
      viaStream = parseBRDSchedule(allTextLines);
    } catch {
      viaStream = null;
    }
    const viaPivot = parseBRDColumns(allTextLines);
    const best =
      (viaPivot?.rows.length ?? 0) > (viaStream?.rows.length ?? 0)
        ? viaPivot
        : viaStream;
    if (best && best.rows.length > 0) return best;
    const diag = getLastPivotDiag();
    throw new Error(
      'Nu am găsit date tabulare BRD. Încearcă să încarci un fișier CSV sau Excel.' +
        (diag && diag !== 'nepornit'
          ? ' (diag: ' +
            (diag.length > 300 ? diag.slice(0, 300) + '…' : diag) +
            ')'
          : '')
    );
  }

  // Strategy 1: Find table by marker
  let headerIndex = -1;

  for (let i = 0; i < allTextLines.length; i++) {
    const lower = allTextLines[i].toLowerCase().replace(/\s+/g, ' ');
    if (
      lower.includes('tabel de amortizare') ||
      lower.includes('tabel amortizare') ||
      lower.includes('grafic de rambursare')
    ) {
      // Found marker — header is next line with keywords
      for (let j = i + 1; j < Math.min(i + 4, allTextLines.length); j++) {
        if (lineHasHeaderKeywords(allTextLines[j])) {
          headerIndex = j;
          break;
        }
      }
      if (headerIndex === -1 && i + 1 < allTextLines.length) {
        headerIndex = i + 1;
      }
      break;
    }
  }

  // Strategy 2: Find header by keyword scoring
  if (headerIndex === -1) {
    for (let i = 0; i < Math.min(allTextLines.length, 30); i++) {
      if (lineHasHeaderKeywords(allTextLines[i])) {
        headerIndex = i;
        break;
      }
    }
  }

  // Strategy 3: Find first line with date pattern, use previous line as header
  if (headerIndex === -1) {
    for (let i = 0; i < Math.min(allTextLines.length, 30); i++) {
      if (/\d{1,2}\.\d{1,2}\.\d{2,4}/.test(allTextLines[i])) {
        if (i > 0) {
          headerIndex = i - 1;
        }
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      'Nu am putut identifica antetele tabelului. Încearcă să încarci un fișier CSV sau Excel.'
    );
  }

  // Parse header
  const headerLine = allTextLines[headerIndex];
  const columnNames = parseHeaderLine(headerLine);

  if (columnNames.length < 3) {
    throw new Error(
      'Nu am putut identifica suficiente coloane. Încearcă să încarci un fișier CSV sau Excel.'
    );
  }

  // Extract data rows
  const dataRows: string[][] = [];

  for (let i = headerIndex + 1; i < allTextLines.length; i++) {
    const line = allTextLines[i];
    if (!line) continue;

    // Skip summary/footer/header lines
    const lower = line.toLowerCase();
    if (
      lower.includes('total') ||
      lower.includes('suma') ||
      lower.includes('sumă') ||
      lower.includes('grafic') ||
      lower.includes('prezentul') ||
      lower.includes('cu stimă') ||
      lower.includes('scor') ||
      lower.includes('scadenţar') ||
      lower.includes('scadențar') ||
      lower.includes('creditului') ||
      lower.includes('dobânzilor')
    ) {
      continue;
    }

    // First cell must look like a date (dd.mm.yyyy)
    const firstCell = line.split(/\s+/)[0] ?? '';
    if (!/\d{1,2}\.\d{1,2}\.\d{2,4}/.test(firstCell)) continue;

    const cells = parseDataLine(line, columnNames.length);
    const nonEmpty = cells.filter(c => c && c.trim().length > 0).length;

    if (nonEmpty >= 2) {
      dataRows.push(cells);
    }
  }

  if (dataRows.length === 0) {
    throw new Error(
      'Nu am găsit date tabulare. Încearcă să încarci un fișier CSV sau Excel.'
    );
  }

  return { headers: columnNames, rows: dataRows };
}

function lineHasHeaderKeywords(line: string): boolean {
  const lower = line.toLowerCase();
  const keywords = ['suma', 'plată', 'plata', 'dobând', 'doband', 'capital', 'data', 'rata'];
  const score = keywords.filter(kw => lower.includes(kw)).length;
  return score >= 2;
}

function parseHeaderLine(line: string): string[] {
  // Try to match known ING column patterns
  const patterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /data\s+urm[aă]toarei\s+pl[aă][tţ][iîţț]/i, name: 'Data' },
    { regex: /suma\s+de\s+plat[aă]/i, name: 'Suma de plată' },
    { regex: /dob[aâ]nd[aă]/i, name: 'Dobânda' },
    { regex: /rata\s+capital/i, name: 'Rata capital' },
    { regex: /capital\s+datorat/i, name: 'Capital datorat' },
    { regex: /sold/i, name: 'Sold' },
    { regex: /\bnr/i, name: 'Nr' },
  ];

  const found: string[] = [];
  let remaining = line;

  for (const pat of patterns) {
    const match = remaining.match(pat.regex);
    if (match) {
      found.push(pat.name);
      remaining = remaining.replace(match[0], ' ');
    }
  }

  if (found.length >= 3) return found;

  // Fallback: split by multiple spaces
  const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
  if (parts.length >= 3) return parts.map(p => p.trim());

  // Last resort: split by single spaces
  const words = line.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 3) return words;

  return found.length > 0 ? found : [line];
}

function parseDataLine(line: string, expectedCols: number): string[] {
  // Try splitting by multiple spaces or tabs
  let parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);

  if (parts.length === expectedCols) {
    return parts.map(p => p.trim());
  }

  if (parts.length > expectedCols) {
    return parts.slice(0, expectedCols).map(p => p.trim());
  }

  // Try splitting by single spaces
  parts = line.split(/\s+/).filter(p => p.trim().length > 0);

  if (parts.length >= expectedCols) {
    return parts.slice(0, expectedCols).map(p => p.trim());
  }

  // Pad with empty strings if too few
  while (parts.length < expectedCols) {
    parts.push('');
  }

  return parts.map(p => p.trim());
}
