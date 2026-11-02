import type { CreditInstallment } from '../../types/credit';

/**
 * Parse common Romanian bank date formats:
 * dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy, yyyy-mm-dd, mm.yyyy, mm/yyyy.
 */
export function parseCreditDate(value?: string): Date | null {
  if (!value) return null;
  const text = value.trim();

  let match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    if (isValidParts(year, month, day)) return new Date(year, month - 1, day);
  }

  match = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (isValidParts(year, month, day)) return new Date(year, month - 1, day);
  }

  match = text.match(/^(\d{1,2})[./-](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (isValidParts(year, month, 1)) return new Date(year, month - 1, 1);
  }

  return null;
}

function isValidParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

/**
 * Number of monthly installments left starting from the current month.
 * Existing early-payment rows (without installment number) are ignored.
 * Returns null when the schedule has no parseable dates.
 */
export function countRemainingInstallments(
  installments: CreditInstallment[],
  from: Date = new Date()
): number | null {
  const currentMonthStart = new Date(from.getFullYear(), from.getMonth(), 1);
  let parseable = 0;
  let remaining = 0;

  for (const installment of installments) {
    if (installment.isExtraPayment) continue;
    const date = parseCreditDate(installment.date);
    if (!date) continue;
    parseable += 1;
    if (date >= currentMonthStart) remaining += 1;
  }

  return parseable > 0 ? remaining : null;
}
