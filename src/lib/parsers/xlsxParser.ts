import * as XLSX from 'xlsx';
import type { ParsedData } from '../../types/credit';

/**
 * Parse XLSX file content into structured data.
 */
export function parseXLSX(arrayBuffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Fișierul Excel nu conține foi de calcul.');
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('Foia de calcul este goală.');
  }

  // Find the first row that looks like headers
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i];
    if (row && row.length > 2) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (jsonData[headerRowIndex] ?? []).map(h => String(h ?? ''));
  const dataRows: string[][] = [];

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row) continue;

    // Skip empty rows
    const allEmpty = row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
    if (allEmpty) continue;

    const normalizedRow = headers.map((_, j) => {
      const cell = row[j];
      return cell !== undefined && cell !== null ? String(cell) : '';
    });

    dataRows.push(normalizedRow);
  }

  if (dataRows.length === 0) {
    throw new Error('Nu am găsit date în fișierul Excel.');
  }

  return { headers, rows: dataRows };
}
