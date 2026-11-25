import * as XLSX from 'xlsx';
import { STOCK_UNIVERSE } from './stockData';

export interface ParsedHoldingItem {
  symbol: string;
  shares: number;
  avgBuy: number;
  rawName?: string;
}

/**
 * Normalizes user/broker symbol input to match our NSE or US universe.
 * Handles broker naming variants like 'TCS', 'TCS-EQ', 'TATAMOTORS', 'HDFCBANK-EQ', etc.
 */
export function normalizeSymbol(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/[-_]EQ$/, '').replace(/\s+/g, '');
  if (!clean) return '';

  // Direct match in universe
  const directMatch = STOCK_UNIVERSE.find(
    s => s.symbol.toUpperCase() === clean ||
         s.symbol.replace('.NS', '').toUpperCase() === clean ||
         s.name.toUpperCase().includes(clean)
  );

  if (directMatch) return directMatch.symbol;

  // If already ends with .NS or .BO
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;

  // Default to NSE symbol
  return `${clean}.NS`;
}

/**
 * Parses Excel files (.xlsx, .xls, .csv) holding reports from Zerodha, Groww, Upstox, AngelOne, etc.
 */
export async function parseExcelHoldings(file: File): Promise<ParsedHoldingItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) return [];

  // Find header row indices
  let headerRowIndex = -1;
  let symbolCol = -1;
  let qtyCol = -1;
  let priceCol = -1;

  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();
      if (
        cell.includes('symbol') ||
        cell.includes('instrument') ||
        cell.includes('scrip') ||
        cell.includes('stock') ||
        cell.includes('security') ||
        cell.includes('company')
      ) {
        if (symbolCol === -1) symbolCol = c;
      } else if (
        cell.includes('qty') ||
        cell.includes('quantity') ||
        cell.includes('shares') ||
        cell.includes('volume')
      ) {
        if (qtyCol === -1) qtyCol = c;
      } else if (
        cell.includes('buy price') ||
        cell.includes('avg price') ||
        cell.includes('avg. cost') ||
        cell.includes('avg cost') ||
        cell.includes('cost price') ||
        cell.includes('purchase price') ||
        cell.includes('buy avg') ||
        cell.includes('price')
      ) {
        if (priceCol === -1) priceCol = c;
      }
    }

    if (symbolCol !== -1 && qtyCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback defaults if header search was ambiguous
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    symbolCol = 0;
    qtyCol = 1;
    priceCol = 2;
  }

  const results: ParsedHoldingItem[] = [];

  for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row) || !row[symbolCol]) continue;

    const rawSym = String(row[symbolCol] || '').trim();
    if (!rawSym || rawSym.toLowerCase().includes('total') || rawSym.toLowerCase().includes('subtotal')) {
      continue;
    }

    const rawQty = parseFloat(String(row[qtyCol] || '0').replace(/[^0-9.-]/g, ''));
    let rawPrice = priceCol !== -1 ? parseFloat(String(row[priceCol] || '0').replace(/[^0-9.-]/g, '')) : 0;

    if (isNaN(rawQty) || rawQty <= 0) continue;

    const normalized = normalizeSymbol(rawSym);
    const universeMatch = STOCK_UNIVERSE.find(s => s.symbol === normalized);

    if (isNaN(rawPrice) || rawPrice <= 0) {
      rawPrice = 500;
    }

    results.push({
      symbol: normalized,
      shares: Math.round(rawQty),
      avgBuy: Number(rawPrice.toFixed(2)),
      rawName: rawSym
    });
  }

  return results;
}

/**
 * Parses PDF holding statements by reading text streams for securities, quantity, and buy price.
 */
export async function parsePdfHoldings(file: File): Promise<ParsedHoldingItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = textDecoder.decode(new Uint8Array(arrayBuffer));

  const results: ParsedHoldingItem[] = [];

  // Look for occurrences of known stocks or capital words followed by numbers
  STOCK_UNIVERSE.forEach(stock => {
    const baseSym = stock.symbol.replace('.NS', '');
    const regex = new RegExp(
      `(${baseSym}|${stock.name.split(' ')[0]})[\\s\\S]{1,60}?([0-9]{1,5})[\\s\\S]{1,40}?([0-9]{2,7}(\\.[0-9]+)?)`,
      'i'
    );
    const match = rawText.match(regex);
    if (match) {
      const shares = parseInt(match[2], 10);
      const price = parseFloat(match[3]);
      if (shares > 0 && shares < 100000 && price > 5) {
        results.push({
          symbol: stock.symbol,
          shares,
          avgBuy: price,
          rawName: stock.name
        });
      }
    }
  });

  // If simple text extraction didn't match known ones, fallback to line scanning
  if (results.length === 0) {
    const lines = rawText.split(/[\r\n]+/);
    for (const line of lines) {
      const match = line.match(/([A-Z]{3,15})[\s,]+([0-9]{1,5})[\s,]+([0-9]+(\.[0-9]{1,2})?)/);
      if (match) {
        const sym = normalizeSymbol(match[1]);
        const shares = parseInt(match[2], 10);
        const price = parseFloat(match[3]);
        if (shares > 0 && price > 0) {
          results.push({
            symbol: sym,
            shares,
            avgBuy: price,
            rawName: match[1]
          });
        }
      }
    }
  }

  return results;
}
