// Deterministic extraction for XLSX/CSV portfolio exports (ADR 0022,
// part C). No AI call — exact numbers, no cost, and no reliance on a
// model to transcribe figures it could get wrong. Column names vary a lot
// across brokers, so the header row is *detected* by keyword rather than
// assumed to be row 1.

import ExcelJS from 'exceljs';
import { parse as parseCsvSync } from 'csv-parse/sync';
import type { ExtractedHolding } from './types';

const SYMBOL_HEADERS = ['symbol', 'scrip', 'ticker', 'stock', 'company', 'security', 'instrument'];
const QTY_HEADERS = ['qty', 'quantity', 'shares', 'units', 'no. of shares', 'holding qty'];
const PRICE_HEADERS = [
  'avg price',
  'average price',
  'buy price',
  'avg cost',
  'purchase price',
  'price',
  'cost',
  'rate',
];

const HEADER_SCAN_ROWS = 5;

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '').trim().toLowerCase();
}

interface ColumnIndexes {
  symbolCol: number;
  qtyCol: number;
  priceCol: number;
}

function findColumns(headerRow: unknown[]): ColumnIndexes | null {
  const normalized = headerRow.map(normalizeHeader);
  const findCol = (keys: string[]) => normalized.findIndex((c) => keys.some((k) => c.includes(k)));
  const symbolCol = findCol(SYMBOL_HEADERS);
  const qtyCol = findCol(QTY_HEADERS);
  const priceCol = findCol(PRICE_HEADERS);
  if (symbolCol === -1 || qtyCol === -1 || priceCol === -1) return null;
  return { symbolCol, qtyCol, priceCol };
}

/** Short, all-caps-ish tokens ("TCS", "M&M") read as a ticker; anything
 * longer or mixed-case reads as a company name ("Tata Consultancy..."). */
function looksLikeSymbol(text: string): boolean {
  return /^[A-Z0-9&.-]{1,20}$/.test(text);
}

/** Scans the first few rows for one that looks like a header (recognizable
 * symbol/qty/price column names), then maps every row below it. Returns
 * `null` when no header row is found — the caller reports this as
 * `no_holdings_found`, not a silent empty list. */
export function rowsToHoldings(rows: unknown[][]): ExtractedHolding[] | null {
  let headerRowIndex = -1;
  let columns: ColumnIndexes | null = null;
  for (let i = 0; i < Math.min(HEADER_SCAN_ROWS, rows.length); i++) {
    const found = findColumns(rows[i] ?? []);
    if (found) {
      headerRowIndex = i;
      columns = found;
      break;
    }
  }
  if (!columns) return null;

  const holdings: ExtractedHolding[] = [];
  for (const row of rows.slice(headerRowIndex + 1)) {
    const rawCell = row[columns.symbolCol];
    const qty = Number(row[columns.qtyCol]);
    const price = Number(row[columns.priceCol]);
    if (rawCell === null || rawCell === undefined || rawCell === '') continue;
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) continue;

    const text = String(rawCell).trim();
    if (!text) continue;
    holdings.push({
      rawSymbol: looksLikeSymbol(text) ? text.toUpperCase() : null,
      rawName: looksLikeSymbol(text) ? null : text,
      quantity: qty,
      avgPrice: price,
    });
  }
  return holdings.length > 0 ? holdings : null;
}

/** Unwraps exceljs's richer cell value shapes (formula results, rich text,
 * hyperlinks, dates) down to a plain primitive `rowsToHoldings` can read. */
function cellToPrimitive(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const obj = value as unknown as Record<string, unknown>;
    if ('result' in obj) return cellToPrimitive(obj.result as ExcelJS.CellValue);
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((r) => r.text ?? '').join('');
    }
    if ('text' in obj) return obj.text;
    return null;
  }
  return value;
}

export async function extractFromXlsx(buffer: Buffer): Promise<ExtractedHolding[] | null> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return null;

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    // `row.values` is 1-indexed — index 0 is always undefined.
    const cells = (row.values as ExcelJS.CellValue[]).slice(1);
    rows.push(cells.map(cellToPrimitive));
  });
  return rowsToHoldings(rows);
}

export function extractFromCsv(text: string): ExtractedHolding[] | null {
  const rows = parseCsvSync(text, {
    skip_empty_lines: true,
    relax_column_count: true,
  }) as unknown[][];
  return rowsToHoldings(rows);
}
