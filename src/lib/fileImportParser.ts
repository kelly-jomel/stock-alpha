import * as XLSX from 'xlsx';
import { STOCK_UNIVERSE } from './stockData';

export interface ParsedHoldingItem {
  symbol: string;
  shares: number;
  avgBuy: number;
  rawName?: string;
  tradeCount?: number;
  totalBought?: number;
  totalSold?: number;
  realizedPnL?: number;
}

export interface ParsedTradeOrder {
  symbol: string;
  rawSymbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date?: string;
  orderId?: string;
  exchange?: string;
}

/**
 * Normalizes user/broker symbol input to match our NSE or Indian universe.
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
 * Consolidates a list of Buy and Sell orders using standard Weighted Average Cost / FIFO.
 * Computes net remaining shares and the weighted average purchase price of active positions.
 */
export function consolidateOrders(orders: ParsedTradeOrder[]): ParsedHoldingItem[] {
  // Group orders by normalized symbol
  const grouped: Record<string, ParsedTradeOrder[]> = {};

  orders.forEach(order => {
    if (!grouped[order.symbol]) {
      grouped[order.symbol] = [];
    }
    grouped[order.symbol].push(order);
  });

  const results: ParsedHoldingItem[] = [];

  for (const [symbol, tradeList] of Object.entries(grouped)) {
    let currentShares = 0;
    let totalCost = 0;
    let totalBought = 0;
    let totalSold = 0;
    let realizedPnL = 0;

    for (const trade of tradeList) {
      if (trade.type === 'BUY') {
        const tradeCost = trade.quantity * trade.price;
        totalCost += tradeCost;
        currentShares += trade.quantity;
        totalBought += trade.quantity;
      } else if (trade.type === 'SELL') {
        totalSold += trade.quantity;
        if (currentShares > 0) {
          const avgPriceBeforeSell = totalCost / currentShares;
          const soldQty = Math.min(trade.quantity, currentShares);
          realizedPnL += soldQty * (trade.price - avgPriceBeforeSell);

          currentShares -= soldQty;
          totalCost = currentShares * avgPriceBeforeSell;
        }
      }
    }

    if (currentShares > 0) {
      const avgBuy = totalCost / currentShares;
      results.push({
        symbol,
        shares: currentShares,
        avgBuy: Number(avgBuy.toFixed(2)),
        rawName: tradeList[0]?.rawSymbol || symbol,
        tradeCount: tradeList.length,
        totalBought,
        totalSold,
        realizedPnL: Number(realizedPnL.toFixed(2))
      });
    }
  }

  return results;
}

/**
 * Parses an Excel or CSV Order History statement (Zerodha tradebook/orderbook, Groww orders, Upstox, AngelOne).
 * Recognizes Buy/Sell transaction types, quantities, execution prices, and executes consolidation.
 */
export async function parseExcelOrderHistory(file: File): Promise<{
  consolidatedHoldings: ParsedHoldingItem[];
  rawOrders: ParsedTradeOrder[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) {
    return { consolidatedHoldings: [], rawOrders: [] };
  }

  let headerRowIndex = -1;
  let symbolCol = -1;
  let typeCol = -1;
  let qtyCol = -1;
  let priceCol = -1;
  let dateCol = -1;
  let orderIdCol = -1;

  for (let r = 0; r < Math.min(jsonData.length, 20); r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();

      if (
        cell.includes('symbol') ||
        cell.includes('instrument') ||
        cell.includes('scrip') ||
        cell.includes('stock') ||
        cell.includes('security')
      ) {
        if (symbolCol === -1) symbolCol = c;
      } else if (
        cell.includes('type') ||
        cell.includes('side') ||
        cell.includes('action') ||
        cell.includes('buy/sell') ||
        cell.includes('trade_type')
      ) {
        if (typeCol === -1) typeCol = c;
      } else if (
        cell.includes('qty') ||
        cell.includes('quantity') ||
        cell.includes('filled') ||
        cell.includes('shares') ||
        cell.includes('traded qty')
      ) {
        if (qtyCol === -1) qtyCol = c;
      } else if (
        cell.includes('price') ||
        cell.includes('trade price') ||
        cell.includes('avg price') ||
        cell.includes('execution price') ||
        cell.includes('rate')
      ) {
        if (priceCol === -1) priceCol = c;
      } else if (
        cell.includes('date') ||
        cell.includes('trade date') ||
        cell.includes('time') ||
        cell.includes('order date')
      ) {
        if (dateCol === -1) dateCol = c;
      } else if (
        cell.includes('order id') ||
        cell.includes('trade id') ||
        cell.includes('order no')
      ) {
        if (orderIdCol === -1) orderIdCol = c;
      }
    }

    if (symbolCol !== -1 && (qtyCol !== -1 || priceCol !== -1)) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback defaults if header search was ambiguous
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    symbolCol = 0;
    typeCol = 1;
    qtyCol = 2;
    priceCol = 3;
  }

  const rawOrders: ParsedTradeOrder[] = [];

  for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row) || !row[symbolCol]) continue;

    const rawSym = String(row[symbolCol] || '').trim();
    if (!rawSym || rawSym.toLowerCase().includes('total') || rawSym.toLowerCase().includes('subtotal')) {
      continue;
    }

    const typeCell = typeCol !== -1 ? String(row[typeCol] || '').toUpperCase().trim() : 'BUY';
    const isSell = typeCell.includes('SELL') || typeCell === 'S' || typeCell.includes('SHORT');
    const orderType: 'BUY' | 'SELL' = isSell ? 'SELL' : 'BUY';

    const rawQty = parseFloat(String(row[qtyCol] || '0').replace(/[^0-9.-]/g, ''));
    let rawPrice = priceCol !== -1 ? parseFloat(String(row[priceCol] || '0').replace(/[^0-9.-]/g, '')) : 0;

    if (isNaN(rawQty) || rawQty <= 0) continue;
    if (isNaN(rawPrice) || rawPrice <= 0) rawPrice = 500;

    const normalized = normalizeSymbol(rawSym);

    rawOrders.push({
      symbol: normalized,
      rawSymbol: rawSym,
      type: orderType,
      quantity: Math.round(rawQty),
      price: Number(rawPrice.toFixed(2)),
      date: dateCol !== -1 ? String(row[dateCol] || '') : undefined,
      orderId: orderIdCol !== -1 ? String(row[orderIdCol] || '') : undefined
    });
  }

  const consolidatedHoldings = consolidateOrders(rawOrders);
  return { consolidatedHoldings, rawOrders };
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
