import type { ParsedData } from '../../types/credit';
import { BRD_HEADERS } from './brdPdfParser';
import { parseRomanianNumber } from '../credit/numberParser';

/**
 * Parser coloana-cu-coloana pentru scadentare BRD extrase cu pdfjs.
 *
 * Gruparea pdfjs dupa coordonata Y produce pentru acest PDF linii care
 * contin O COLOANA INTREAGA (toate soldurile, apoi toate datele), nu
 * randuri — plus fragmente si linii amestecate. Parserul pe randuri nu
 * are ce gasi in asa ceva.
 *
 * Pentru fiecare linie-data se cauta in jur linii numerice cu acelasi
 * numar de valori si se incearca asignarea rolurilor plata / asigurare /
 * sold / C+D. Capitalul se deriva din diferenta de sold (lant ancorat la
 * creditul initial), dobanda ca rest. Validare stricta: C+D = Suma -
 * Asigurare pe linie independenta, anti-ambiguitate (prima <= 20% din
 * rata), sold strict descrescator, global suma capitalurilor + soldul
 * final = creditul initial. Returneaza null la orice esec.
 */

const DATE_TOKEN_RE = /^(\d{2})[\/.](\d{2})[\/.](\d{4})$/;
const NUMBER_TOKEN_RE = /^(?=.*\d)[\d.,()\-+]+$/;
const MAX_PAYMENT = 100_000;
const MAX_SOLD = 500_000;
const MAX_INSURANCE = 5_000;
const TOL = 0.05;
const GLOBAL_TOL = 2.0;
const WINDOW = 45;

export const PAGE_SENTINEL = '\u0000PAGE\u0000';

// Ultimul diagnostic compact (inclus in eroarea din UI).
let lastDiag = 'nepornit';
export function getLastPivotDiag(): string {
  return lastDiag;
}

type NumLine = { idx: number; tokens: string[]; values: number[] };
const TOTAL_LINE_RE = /^total\b/i;
const AVANSAT_RE = /avansat/i;

export function parseBRDColumns(lines: string[]): ParsedData | null {
  try {
    return parseBRDColumnsInner(lines);
  } catch {
    lastDiag = 'exceptie';
    return null;
  }
}

function parseBRDColumnsInner(lines: string[]): ParsedData | null {
  const norm = lines.map(l => l.replace(/\s*\/\s*/g, '/'));

  type LineInfo = {
    idx: number;
    block: number;
    kind: 'date' | 'num' | 'junk';
    dates: string[];
    nums: NumLine | null;
  };
  let block = 0;
  const infos: LineInfo[] = norm.map((line, idx) => {
    if (line.includes(PAGE_SENTINEL)) {
      block++;
      return { idx, block, kind: 'junk', dates: [], nums: null };
    }
    const tokens = line.split(/\s+/).filter(t => t.length > 0);
    if (
      tokens.length === 0 ||
      !tokens.every(t => DATE_TOKEN_RE.test(t) || NUMBER_TOKEN_RE.test(t))
    ) {
      return { idx, block, kind: 'junk', dates: [], nums: null };
    }
    const dates = tokens.filter(t => DATE_TOKEN_RE.test(t));
    if (dates.length > 0) {
      return { idx, block, kind: 'date', dates, nums: null };
    }
    return {
      idx,
      block,
      kind: 'num',
      dates: [],
      nums: { idx, tokens, values: tokens.map(parseRomanianNumber) },
    };
  });

  const dateIdxs = infos.filter(i => i.kind === 'date').map(i => i.idx);
  if (dateIdxs.length === 0) {
    lastDiag = 'nicio-linie-data';
    return null;
  }

  // Candidati pentru soldul initial: linia Total/Avansat sau cozile
  // coloanelor (valorile randului Total lipite la final, ultima pagina).
  const candidates: number[] = [];
  const pushCand = (v: number) => {
    if (v > 50000 && !candidates.some(c => Math.abs(c - v) < 0.01)) {
      candidates.push(v);
    }
  };
  const fast = harvestInitial(norm);
  if (fast !== null) pushCand(fast);
  for (const t of collectTails(infos, dateIdxs)) pushCand(t);
  if (candidates.length === 0) {
    lastDiag = 'initial-negasit(Total/Avansat/cozi lipsa)';
    return null;
  }

  for (const initial of candidates) {
    const diag: string[] = [];
    const res = runWithInitial(infos, dateIdxs, initial, diag);
    if (res !== null) return res;
    lastDiag = `candidat ${initial.toFixed(2)} respins | ` + diag.join(' | ');
  }
  return null;
}

/** Cozi de coloane: linii cu o valoare IN PLUS (randul Total la final). */
function collectTails(
  infos: Array<{ block: number; kind: string; nums: NumLine | null; dates: string[] }>,
  dateIdxs: number[]
): number[] {
  const tails: number[] = [];
  for (const di of dateIdxs) {
    const info = infos[di];
    const N = info.dates.length;
    if (N === 0) continue;
    const blk = info.block;
    for (
      let k = Math.max(0, di - WINDOW);
      k < Math.min(infos.length, di + WINDOW + 1);
      k++
    ) {
      const it = infos[k];
      if (it.block !== blk || it.kind !== 'num' || !it.nums) continue;
      if (it.nums.tokens.length === N + 1) {
        tails.push(it.nums.values[it.nums.values.length - 1]);
      }
    }
  }
  return tails;
}

/** Rulare completa cu un initial candidat. Null la orice esec. */
function runWithInitial(
  infos: Array<{
    block: number;
    kind: string;
    dates: string[];
    nums: NumLine | null;
  }>,
  dateIdxs: number[],
  initial: number,
  diag: string[]
): ParsedData | null {
  const consumed = new Set<string>();
  const allRows: string[][] = [];
  let runSold: number | null = initial;
  diag.push('initial=' + initial.toFixed(2));

  for (const di of dateIdxs) {
    const info = infos[di];
    const seqs: string[][] = [info.dates];
    const glued = stitchAdjacentDates(infos, di);
    if (glued.length > info.dates.length) seqs.unshift(glued);

    for (const dates of seqs) {
      if (dates.every(d => consumed.has(d))) continue;
      const rows = tryDateSeq(dates, di, infos, runSold, diag);
      if (rows !== null) {
        for (const r of rows) allRows.push(r);
        for (const d of dates) consumed.add(d);
        runSold = parseRomanianNumber(rows[rows.length - 1][10]);
        diag.push(`OK@{di}(+${rows.length})`);
        break;
      }
      diag.push(`SKIP@{di}(N=${dates.length})`);
    }
  }

  if (allRows.length === 0) {
    diag.push('0randuri');
    return null;
  }

  // Global: suma capitalurilor + soldul final = creditul initial.
  let capSum = 0;
  for (const r of allRows) capSum += parseRomanianNumber(r[7]);
  const finalSold = parseRomanianNumber(allRows[allRows.length - 1][10]);
  if (Math.abs(capSum + finalSold - initial) > GLOBAL_TOL) {
    diag.push(
      `global-fail(rows=${allRows.length},cap=${capSum.toFixed(2)},fin=${finalSold.toFixed(2)})`
    );
    return null;
  }

  return { headers: [...BRD_HEADERS], rows: allRows };
}

/** Concateneaza liniile-data adiacente din acelasi bloc (fragmente). */
function stitchAdjacentDates(
  infos: Array<{ block: number; kind: string; dates: string[] }>,
  di: number
): string[] {
  const out = [...infos[di].dates];
  const blk = infos[di].block;
  for (let k = di + 1; k < infos.length; k++) {
    const it = infos[k];
    if (it.block !== blk) break;
    if (it.kind === 'date') {
      out.push(...it.dates);
    } else if (it.kind === 'junk') {
      if (k - di > 4) break;
      continue;
    } else {
      break;
    }
  }
  return out;
}

function harvestInitial(norm: string[]): number | null {
  for (let li = 0; li < norm.length; li++) {
    const line = norm[li];
    if (TOTAL_LINE_RE.test(line.trim())) {
      // Linia Total poate fi fragmentata: acumulam numere de pe liniile
      // urmatoare pana la 7+, oprindu-ne la linii cu data.
      let nums = line
        .split(/\s+/)
        .filter(t => NUMBER_TOKEN_RE.test(t) && !DATE_TOKEN_RE.test(t))
        .map(parseRomanianNumber);
      for (let k = li + 1; k < norm.length && nums.length < 7; k++) {
        if (DATE_TOKEN_RE.test(norm[k])) break;
        const extra = norm[k]
          .split(/\s+/)
          .filter(t => NUMBER_TOKEN_RE.test(t) && !DATE_TOKEN_RE.test(t))
          .map(parseRomanianNumber);
        if (extra.length === 0) {
          if (k - li > 4) break;
          continue;
        }
        nums = nums.concat(extra);
      }
      // Total | plata | C+D | dobanda | amanata | CAPITAL | comision | asigurare
      if (nums.length >= 7 && nums[4] > 10000) return nums[4];
    }
  }
  for (const line of norm) {
    if (AVANSAT_RE.test(line)) {
      const nums = line
        .split(/\s+/)
        .filter(t => NUMBER_TOKEN_RE.test(t) && !DATE_TOKEN_RE.test(t))
        .map(parseRomanianNumber);
      if (nums.length === 1 && nums[0] > 10000) return nums[0];
    }
  }
  return null;
}

function tryDateSeq(
  dates: string[],
  di: number,
  infos: Array<{ block: number; kind: string; nums: NumLine | null }>,
  prevSold: number | null,
  diag: string[]
): string[][] | null {
  if (prevSold === null) return null;
  const N = dates.length;
  if (N === 0) return null;

  // Coloane cu exact N valori, in fereastra si acelasi bloc de pagina.
  const blk = infos[di].block;
  const pool: NumLine[] = [];
  const poolPlus: NumLine[] = [];
  for (
    let k = Math.max(0, di - WINDOW);
    k < Math.min(infos.length, di + WINDOW + 1);
    k++
  ) {
    const it = infos[k];
    if (it.block !== blk) continue;
    if (it.kind === 'num' && it.nums && it.nums.tokens.length === N) {
      pool.push(it.nums);
    } else if (it.kind === 'num' && it.nums && it.nums.tokens.length === N + 1) {
      poolPlus.push(it.nums);
    }
  }
  diag.push(`dl@{di}(N=${N},pool=${pool.length},plus=${poolPlus.length})`);
  const direct = tryPool(dates, pool, prevSold);
  if (direct !== null) return direct;

  // Retry: valorile randului Total lipite la final (ultima pagina).
  if (poolPlus.length > 0) {
    const truncated: NumLine[] = poolPlus.map(l => ({
      idx: l.idx,
      tokens: l.tokens.slice(0, N),
      values: l.values.slice(0, N),
    }));
    const mixed = tryPool(dates, [...pool, ...truncated], prevSold);
    if (mixed !== null) return mixed;
  }
  return null;
}

function tryPool(
  dates: string[],
  pool: NumLine[],
  prevSold: number
): string[][] | null {
  if (pool.length < 4) return null;

  // Rularea intoarce PRIMA atribuire valida, dar la finalul graficului
  // (dobanda mica) si permutarea (plata=C+D, asig=dobanda) trece de
  // verificarea a ≤ 20% din rata, pentru ca C+D = dobanda + capital.
  // Asignarea corecta are mereu suma asigurarilor mai mica (asigurarea
  // este cea mai mica componenta), deci preferam minimul.
  let best: { rows: string[][]; insSum: number } | null = null;
  for (const pay of pool) {
    if (!pay.values.every(v => v > 0 && v <= MAX_PAYMENT)) continue;
    for (const ins of pool) {
      if (ins === pay) continue;
      if (!ins.values.every(v => v >= 0 && v <= MAX_INSURANCE)) continue;
      for (const sold of pool) {
        if (sold === pay || sold === ins) continue;
        if (!sold.values.every(v => v >= 0 && v <= MAX_SOLD)) continue;
        for (const cd of pool) {
          if (cd === pay || cd === ins || cd === sold) continue;
          const rows = tryBuild(dates, pay, ins, sold, cd, prevSold);
          if (rows === null) continue;
          const insSum = ins.values.reduce((s, v) => s + v, 0);
          if (best === null || insSum < best.insSum) {
            best = { rows, insSum };
            if (insSum === 0) return rows;
          }
        }
      }
    }
  }
  return best?.rows ?? null;
}

function tryBuild(
  dates: string[],
  pay: NumLine,
  ins: NumLine,
  sold: NumLine,
  cd: NumLine,
  prevSold: number
): string[][] | null {
  const N = dates.length;
  const rows: string[][] = [];
  let runSold = prevSold;

  for (let i = 0; i < N; i++) {
    const p = pay.values[i];
    const s = sold.values[i];
    const a = ins.values[i];
    const c = cd.values[i];

    // C+D independent: plata - asigurare = coloana C+D.
    if (Math.abs(p - a - c) > TOL) return null;
    // Anti-ambiguitate: asignarea rotita (plata=C+D, asig=dobanda) trece
    // ecuatia prin simetrie, dar pune prima ~80% din rata (reala: sub 6%).
    if (a > 0.2 * p) return null;
    // Sold strict descrescator fata de ancora.
    if (!(s < runSold)) return null;
    const cap = runSold - s;
    if (!(cap >= -TOL)) return null;
    const interest = p - cap - a;
    if (!(interest >= -TOL)) return null;

    rows.push([
      '',
      dates[i],
      pay.tokens[i],
      c.toFixed(2),
      '',
      interest.toFixed(2),
      '',
      cap.toFixed(2),
      '',
      ins.tokens[i],
      sold.tokens[i],
    ]);
    runSold = s;
  }

  return rows;
}
