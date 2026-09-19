import type { ColumnMapping } from '../../types/credit';

type PatternEntry = {
  field: keyof ColumnMapping;
  patterns: RegExp[];
  keywords: string[];
};

const COLUMN_RULES: PatternEntry[] = [
  {
    field: 'installmentNumber',
    patterns: [
      /^nr\.?\s*crt\.?$/i,
      /^nr\.?$/i,
      /^num[aă]r\s*rat[aă]$/i,
      /^rat[aă]$/i,
      /^rate$/i,
      /^installment$/i,
      /^payment\s*number$/i,
      /^index$/i,
    ],
    keywords: ['nr', 'crt', 'numar rata', 'număr rată', 'rate', 'numar', 'număr', 'installment'],
  },
  {
    field: 'date',
    patterns: [
      /^data$/i,
      /^date$/i,
      /^dat[aă]\scaden[sț][aă]$/i,
      /^dat[aă]\spl[aă]t[iî]/i,
      /^data\s*urm[aă]toarei\s*pl[aă]t[iî]/i,
      /^maturity\s*date$/i,
      /^due\s*date$/i,
      /^\s*payment\s*date$/i,
    ],
    keywords: ['data', 'date', 'cadenta', 'cadentă', 'urmatoarei', 'următoarei'],
  },
  {
    field: 'payment',
    patterns: [
      /^rat[aă]\stotal[aă]$/i,
      /^total\s*rat[aă]$/i,
      /^payment$/i,
      /^total\s*payment$/i,
      /^rata\s+lunar[aă]$/i,
      /^valoare\s*rat[aă]$/i,
      /^suma\s*de\s*plat[aă]$/i,
      /^monthly\s*payment$/i,
      /^emisie$/i,
    ],
    keywords: ['rata totala', 'rata totală', 'total rata', 'payment', 'rata lunara', 'rata lunară', 'valoare rata', 'suma de plata', 'suma de plată'],
  },
  {
    field: 'principal',
    patterns: [
      /^principal$/i,
      /^capital$/i,
      /^rata\s*capital$/i,
      /^principal\s*repayment$/i,
      /^capital\s*rambursat$/i,
      /^rambursare\s*capital$/i,
      /^sold\s*principal$/i,
      /^principal\s*payment$/i,
      /^capital\s*principal$/i,
      /^capitol$/i,
    ],
    keywords: ['rata capital', 'principal', 'rambursare capital', 'rambursat'],
  },
  {
    field: 'interest',
    patterns: [
      /^dob[aâ]nd[aă]$/i,
      /^dobanda$/i,
      /^interest$/i,
      /^interest\s*amount$/i,
      /^dob[aâ]nd[aă]\s*rat[aă]$/i,
      /^dobanda_rata$/i,
      /^dobanda\s+rata$/i,
      /^rata\s*dob[aâ]nd[aă]$/i,
      /^dobanda lunara$/i,
      /^interest\s*payment$/i,
    ],
    keywords: ['dobanda', 'dobând', 'doband', 'interest', 'rata dobanda', 'rata dobând'],
  },
  {
    field: 'fees',
    patterns: [
      /^comision$/i,
      /^comisioane$/i,
      /^fee$/i,
      /^fees$/i,
      /^commission$/i,
      /^comision\s*banca$/i,
      /^comisioane\s*totale$/i,
      /^total\s*comisioane$/i,
    ],
    keywords: ['comision', 'comisioane', 'fee', 'fees', 'commission'],
  },
  {
    field: 'remainingBalance',
    patterns: [
      /^sold$/i,
      /^sold\s*r[aă]mas$/i,
      /^capital\s*datorat/i,
      /^remaining\s*balance$/i,
      /^outstanding\s*balance$/i,
      /^sold\s*rezidual$/i,
    ],
    keywords: ['capital datorat', 'sold', 'rezidual', 'balance', 'remaining', 'ramas', 'rămas', 'datorat', 'sfarsitul', 'sfârşitul'],
  },
];

function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesRule(header: string, rule: PatternEntry): boolean {
  if (!header) return false;
  const normalized = normalizeHeader(header);

  // Try exact regex patterns
  for (const pattern of rule.patterns) {
    if (pattern.test(header) || pattern.test(normalized)) {
      return true;
    }
  }

  // Try keyword matching (for multi-word headers from PDFs)
  for (const kw of rule.keywords) {
    if (normalized.includes(kw)) {
      return true;
    }
  }

  return false;
}

export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    installmentNumber: null,
    date: null,
    payment: null,
    principal: null,
    interest: null,
    fees: null,
    remainingBalance: null,
  };

  for (const header of headers) {
    if (!header || header.trim().length === 0) continue;

    for (const rule of COLUMN_RULES) {
      if (mapping[rule.field] !== null) continue;

      if (matchesRule(header, rule)) {
        mapping[rule.field] = header;
        break;
      }
    }
  }

  return mapping;
}

export function getColumnNames(headers: string[]): string[] {
  return headers;
}

export function getUnmappedFields(mapping: ColumnMapping): (keyof ColumnMapping)[] {
  const fields: (keyof ColumnMapping)[] = [];
  for (const [key, value] of Object.entries(mapping)) {
    if (value === null) {
      fields.push(key as keyof ColumnMapping);
    }
  }
  return fields;
}

export function getFieldLabel(field: keyof ColumnMapping): string {
  const labels: Record<keyof ColumnMapping, string> = {
    installmentNumber: 'Număr rată',
    date: 'Data',
    payment: 'Rată totală',
    principal: 'Principal',
    interest: 'Dobândă',
    fees: 'Comision',
    remainingBalance: 'Sold rămas',
  };
  return labels[field];
}
