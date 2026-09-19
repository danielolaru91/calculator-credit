import type { CreditInstallment, ParsedData, ColumnMapping } from '../../types/credit';
import { parseRomanianNumber } from './numberParser';

/**
 * Normalize parsed data into CreditInstallment array using column mapping.
 */
export function normalizeInstallments(
  data: ParsedData,
  mapping: ColumnMapping
): CreditInstallment[] {
  const { headers } = data;
  const rows = data.rows;

  const getIndex = (field: keyof ColumnMapping): number => {
    const colName = mapping[field];
    if (!colName) return -1;
    return headers.indexOf(colName);
  };

  const indices = {
    installmentNumber: getIndex('installmentNumber'),
    date: getIndex('date'),
    payment: getIndex('payment'),
    principal: getIndex('principal'),
    interest: getIndex('interest'),
    fees: getIndex('fees'),
    remainingBalance: getIndex('remainingBalance'),
  };

  const installments: CreditInstallment[] = [];

  let autoIndex = 1;

  for (const row of rows) {
    // Skip empty rows
    if (!row || row.every(cell => !cell || cell.trim() === '')) continue;

    const installment: CreditInstallment = {};

    if (indices.installmentNumber >= 0 && row[indices.installmentNumber]) {
      const val = parseRomanianNumber(row[indices.installmentNumber]);
      installment.installmentNumber = val > 0 ? val : undefined;
    }

    // Auto-generate installment number if not present
    if (installment.installmentNumber === undefined) {
      installment.installmentNumber = autoIndex;
    }
    autoIndex++;

    if (indices.date >= 0 && row[indices.date]) {
      const dateStr = row[indices.date]?.trim();
      if (dateStr) {
        installment.date = dateStr;
      }
    }

    if (indices.payment >= 0 && row[indices.payment]) {
      installment.payment = parseRomanianNumber(row[indices.payment]);
    }

    if (indices.principal >= 0 && row[indices.principal]) {
      installment.principal = parseRomanianNumber(row[indices.principal]);
    }

    if (indices.interest >= 0 && row[indices.interest]) {
      installment.interest = parseRomanianNumber(row[indices.interest]);
    }

    if (indices.fees >= 0 && row[indices.fees]) {
      installment.fees = parseRomanianNumber(row[indices.fees]);
    }

    if (indices.remainingBalance >= 0 && row[indices.remainingBalance]) {
      installment.remainingBalance = parseRomanianNumber(row[indices.remainingBalance]);
    }

    // Only add if at least one numeric value is present
    const hasData =
      installment.payment !== undefined ||
      installment.principal !== undefined ||
      installment.interest !== undefined ||
      installment.fees !== undefined;

    if (hasData) {
      installments.push(installment);
    }
  }

  return installments;
}
