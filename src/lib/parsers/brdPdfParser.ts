import type { ParsedData } from '../../types/credit';
import { parseRomanianNumber } from '../credit/numberParser';

/**
 * Parser pe randuri pentru scadentar BRD
 * (Grafic costuri totale / Reimbursement schedule).
 * Folosit cand liniile extrase contin randuri; pentru extractia pdfjs
 * coloana-cu-coloana exista brdPivotParser (parseBRDLines alege maximul).
 *
 * Particularitati BRD: date dd/mm/yyyy, numere internationale (1,685.04),
 * 11 coloane, randuri de rambursare partiala fara Nr. crt.
 * Ecuatia randului: Suma = Capital + Dobanda + Comision + Asigurare
 * (ex: 1,685.04 = 296.61 + 1,293.79 + 0.00 + 94.64).
 * Un rand invalid e abandonat, niciodata ghicit.
 */

export const BRD_HEADERS = [
  'Nr',
  'Data scadenta',
  'Suma de plata',
  'Info baza', // Capital + dobanda — IGNORAT la detectie (altfel fura maparea Dobanzii)
  'Info procent', // Procent dobanda — IGNORAT
  'Dobanda',
  'Info amanata', // Dobanda amanata — IGNORAT (0.00)
  'Capital',
  'Info extra', // Comision — IGNORAT (0.00 in acest PDF)
  'Prima de asigurare', // -> fees (asigurarea intra in costul total)
  'Sold final',
];

const DATE_TOKEN_RE = /^(\d{2})[\/.](\d{2})[\/.](\d{4})$/;
const NUMBER_TOKEN_RE = /^(?=.*\d)[\d.,()\-+]+$/;
const NR_TOKEN_RE = /^\d{1,3}$/;

const MAX_PAYMENT = 100_000;
const MAX_SOLD = 500_000;
const MAX_INSURANCE = 5_000;
const MAX_NR = 500;
const CONSISTENCY_TOLERANCE = 0.05;

const SKIP_PHRASES = [
  'grafic costuri totale',
  'reimbursement schedule',
  'nr. crt',
  'nr crt',
  'data scadenta /',
  'suma de plata /',
  'capital + dobanda',
  'capital + dobânda',
  'procent dobanda',
  'dobanda amanata',
  'dobânda amânată',
  'prima de asigurare /',
  'sold final /',
  'pag.',
  'total',
  'valoare totala',
  'valoare totală',
  'datele cuprinse',
  'brd - groupe',
  'capital social',
  'atestat cnvm',
  'turn brd',
  'comision de analiza',
  'comision de gestiune',
  'polita de asigurare',
  'polița de asigurare',
  'avansat',
  'data descarcarii',
  'date and hour',
];

export function isBRDSchedule(lines: string[]): boolean {
  let score = 0;
  const joined = lines.slice(0, 40).join('\n').toLowerCase();
  if (joined.includes('grafic costuri totale')) score += 2;
  if (joined.includes('reimbursement schedule')) score += 2;
  if (joined.includes('sold final')) score += 1;
  if (joined.includes('prima de asigurare')) score += 1;
  if (
    joined.includes('capital + dobanda') ||
    joined.includes('capital + dobânda')
  )
    score += 1;
  if (joined.includes('brd')) score += 1;
  return score >= 3;
}

export function parseBRDSchedule(allTextLines: string[]): ParsedData {
  const tokens: string[] = [];
  for (const rawLine of allTextLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (SKIP_PHRASES.some(p => lower.includes(p))) continue;
    // Slash-uri despartite ca glife ("07 / 03 / 2024") — lipite la loc.
    const normalized = line.replace(/\s*\/\s*/g, '/');
    tokens.push(...normalized.split(/\s+/).filter(t => t.length > 0));
  }

  // Repara fragmente ("1," + "685.04", "1" + "300.00" cu mii separate).
  const repaired: string[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k];
    const nxt = k + 1 < tokens.length ? tokens[k + 1] : '';
    if (/^\d{1,3}[,.]$/.test(cur) && /^[\d.,()\-+]+$/.test(nxt)) {
      repaired.push(cur + nxt);
      k++;
    } else if (/^\d{1,3}$/.test(cur) && /^\d{3}\.\d+$/.test(nxt)) {
      repaired.push(cur + nxt);
      k++;
    } else {
      repaired.push(cur);
    }
  }

  // Segmentare strict la tokenuri-data (o data nu ajunge in celula numerica).
  const dataRows: string[][] = [];
  let i = 0;
  while (i < repaired.length) {
    const dateMatch = repaired[i].match(DATE_TOKEN_RE);
    if (!dateMatch || !isPlausibleDate(dateMatch)) {
      i++;
      continue;
    }
    const date = repaired[i];

    let nr = '';
    if (i > 0 && NR_TOKEN_RE.test(repaired[i - 1])) {
      const v = parseInt(repaired[i - 1], 10);
      if (v >= 1 && v <= MAX_NR) nr = repaired[i - 1];
    }

    const nums: string[] = [];
    let j = i + 1;
    while (
      j < repaired.length &&
      nums.length < 9 &&
      !DATE_TOKEN_RE.test(repaired[j])
    ) {
      if (NUMBER_TOKEN_RE.test(repaired[j])) nums.push(repaired[j]);
      j++;
    }

    if (nums.length === 9 && isValidBRDRow(nums)) {
      dataRows.push([nr, date, ...nums]);
      i = j;
    } else {
      i++;
    }
  }

  if (dataRows.length === 0) {
    throw new Error(
      'Nu am găsit date tabulare BRD. Încearcă să încarci un fișier CSV sau Excel.'
    );
  }

  return { headers: [...BRD_HEADERS], rows: dataRows };
}

function isPlausibleDate(m: RegExpMatchArray): boolean {
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2060;
}

function isValidBRDRow(nums: string[]): boolean {
  const pay = parseRomanianNumber(nums[0]);
  const rate = parseRomanianNumber(nums[2]);
  const interest = parseRomanianNumber(nums[3]);
  const capital = parseRomanianNumber(nums[5]);
  const commission = parseRomanianNumber(nums[6]);
  const insurance = parseRomanianNumber(nums[7]);
  const sold = parseRomanianNumber(nums[8]);

  if (!(pay > 0) || pay > MAX_PAYMENT) return false;
  if (!(rate >= 0) || rate > 100) return false;
  if (interest < 0 || capital < 0 || commission < 0 || insurance < 0 || sold < 0)
    return false;
  if (sold > MAX_SOLD || insurance > MAX_INSURANCE) return false;

  const expected = capital + interest + commission + insurance;
  if (Math.abs(pay - expected) > CONSISTENCY_TOLERANCE) return false;

  return true;
}
