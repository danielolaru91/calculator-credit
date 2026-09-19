import { parseXLSX } from './xlsxParser';
import type { ParsedData } from '../../types/credit';

/**
 * Parse XLS file content into structured data.
 * XLS files are handled by the same xlsx library.
 */
export function parseXLS(arrayBuffer: ArrayBuffer): ParsedData {
  return parseXLSX(arrayBuffer);
}
