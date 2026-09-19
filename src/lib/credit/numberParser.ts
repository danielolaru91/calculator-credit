/**
 * Parse Romanian number formats to a JavaScript number.
 *
 * Handles:
 * - Romanian format: "1.234,56" -> 1234.56
 * - International format: "1,234.56" -> 1234.56
 * - Values with currency symbols: "1.234,56 lei", "1,234.56 RON"
 * - Negative values: "-1.234,56", "(1.234,56)"
 * - Empty/undefined values -> 0
 */
export function parseRomanianNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;

  if (typeof value === 'number') return value;

  let cleaned = String(value).trim();

  if (cleaned === '' || cleaned === '-') return 0;

  // Remove currency symbols and text
  cleaned = cleaned
    .replace(/\b(lei|RON|EUR|USD|reuron)\b/gi, '')
    .replace(/[^\d,.\-()]/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-') return 0;

  // Handle negative in parentheses: (1.234,56)
  let isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Check for explicit negative sign
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.substring(1);
  }

  // Determine format: Romanian (1.234,56) or International (1,234.56)
  const hasRomanianFormat = /\d+\.\d{3},\d{1,2}$/.test(cleaned);
  const hasInternationalFormat = /\d+,\d{3}\.\d{1,2}$/.test(cleaned);

  let result: number;

  if (hasRomanianFormat) {
    // Romanian: remove dots (thousands), replace comma with dot (decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    result = parseFloat(cleaned);
  } else if (hasInternationalFormat) {
    // International: remove commas (thousands)
    cleaned = cleaned.replace(/,/g, '');
    result = parseFloat(cleaned);
  } else {
    // Ambiguous: check if last separator is comma or dot
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Comma is decimal separator
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      result = parseFloat(cleaned);
    } else if (lastDot > lastComma) {
      // Dot is decimal separator
      cleaned = cleaned.replace(/,/g, '');
      result = parseFloat(cleaned);
    } else {
      // No separators, just a number
      result = parseFloat(cleaned);
    }
  }

  if (isNaN(result)) return 0;

  return isNegative ? -result : result;
}

/**
 * Format a number as Romanian currency format.
 */
export function formatLei(value: number): string {
  return value.toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' lei';
}

/**
 * Format a number as percentage.
 */
export function formatPercent(value: number): string {
  return value.toLocaleString('ro-RO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%';
}

/**
 * Format file size to human readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
