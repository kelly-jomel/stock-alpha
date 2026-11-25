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
 * Comprehensive mapping of Indian company names, broker descriptions, and abbreviations
 * as exported by Groww, Zerodha (Console/Kite), Upstox, AngelOne, ICICI Direct, and HDFC Sky.
 */
const INDIAN_NAME_MAP: Record<string, string> = {
  // Directly from user's broker export screenshot
  'AVENUESAI': 'CCAVENUE.NS',
  'AVENUESAILIMITED': 'CCAVENUE.NS',
  'AVENUE SUPERMARTS': 'DMART.NS',
  'DMART': 'DMART.NS',
  'ACC': 'ACC.NS',
  'ACCLIMITED': 'ACC.NS',
  'ACCLTD': 'ACC.NS',
  'INDIANRAILWAYFINCORP': 'IRFC.NS',
  'INDIANRAILWAYFINCORPL': 'IRFC.NS',
  'IRFC': 'IRFC.NS',
  'GAIL': 'GAIL.NS',
  'GAILINDIA': 'GAIL.NS',
  'GAILINDIALTD': 'GAIL.NS',
  'GAIL(INDIA)LTD': 'GAIL.NS',
  'GAILIND': 'GAIL.NS',
  'GAILLIMITED': 'GAIL.NS',
  'TATASTEEL': 'TATASTEEL.NS',
  'TATASTEELLIMITED': 'TATASTEEL.NS',
  'OLA': 'OLAELEC.NS',
  'OLAELECTRIC': 'OLAELEC.NS',
  'OLAELECTRICMOBILITYLTD': 'OLAELEC.NS',
  'OLAELEC': 'OLAELEC.NS',
  'NIPPONAMC-NETFSILVER': 'SILVERBEES.NS',
  'NIPPONAMCNETFSILVER': 'SILVERBEES.NS',
  'NETFSILVER': 'SILVERBEES.NS',
  'SILVERBEES': 'SILVERBEES.NS',
  'INDIANRAILTOURCORPLTD': 'IRCTC.NS',
  'IRCTC': 'IRCTC.NS',
  'ADITYABIRLALIFESBRANL': 'ABLBL.NS',
  'ABLBL': 'ABLBL.NS',
  'ADITYABIRLAFASHION': 'ABFRL.NS',
  'ABFRL': 'ABFRL.NS',
  'TATAELXSI': 'TATAELXSI.NS',
  'TATAELXSILIMITED': 'TATAELXSI.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'HDFCBANKLTD': 'HDFCBANK.NS',
  'HDFCBANKLIMITED': 'HDFCBANK.NS',
  'RELIANCE': 'RELIANCE.NS',
  'RELIANCEINDUSTRIESLTD': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'TATACONSULTANCYSVC': 'TCS.NS',
  'INFOSYS': 'INFY.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'ICICIBANKLTD': 'ICICIBANK.NS',
  'TATAMOTORS': 'TATAMOTORS.NS',
  'TATAMOTORSLTD': 'TATAMOTORS.NS',
  'ITC': 'ITC.NS',
  'ITCLTD': 'ITC.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'BHARTIAIRTEL': 'BHARTIARTL.NS',
  'SBIN': 'SBIN.NS',
  'STATEBANKOFINDIA': 'SBIN.NS',
  'LT': 'LT.NS',
  'LARSENTOUBRO': 'LT.NS',
  'BAJFINANCE': 'BAJFINANCE.NS',
  'BAJAJFINANCE': 'BAJFINANCE.NS',
  'SUNPHARMA': 'SUNPHARMA.NS',
  'TITAN': 'TITAN.NS',
  'TITANCOMPANYLTD': 'TITAN.NS',
  'MARUTI': 'MARUTI.NS',
  'MARUTISUZUKI': 'MARUTI.NS',
  'AXISBANK': 'AXISBANK.NS',
  'NTPC': 'NTPC.NS',
  'ONGC': 'ONGC.NS',
  'KOTAKBANK': 'KOTAKBANK.NS',
  'POWERGRID': 'POWERGRID.NS',
  'HCLTECH': 'HCLTECH.NS',
  'WIPRO': 'WIPRO.NS',
  'COALINDIA': 'COALINDIA.NS',
  'M&M': 'M&M.NS',
  'MAHINDRA': 'M&M.NS',
  'ADANIENT': 'ADANIENT.NS',
  'ADANIPORTS': 'ADANIPORTS.NS',
  'ULTRACEMCO': 'ULTRACEMCO.NS',
  'ASIANPAINT': 'ASIANPAINT.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'BEML': 'BEML.NS',
  'RAJOOENG': 'RAJOOENG.NS',

  // All User Specific Broker Order History Equities
  'TMPV': 'TMPV.NS',
  'TATAMOTORSPASSVEHLTD': 'TMPV.NS',
  'TATAMOTORSPASSENGELTD': 'TMPV.NS',
  'RVNL': 'RVNL.NS',
  'RAILVIKASNIGAMLIMITED': 'RVNL.NS',
  'RAILVIKASNIGAM': 'RVNL.NS',
  'RTNINDIA': 'RTNINDIA.NS',
  'RATTANINDIAENTLIMITED': 'RTNINDIA.NS',
  'RATTANINDIAENT': 'RTNINDIA.NS',
  'JBMA': 'JBMA.NS',
  'JBMAUTO': 'JBMA.NS',
  'JBMAUTOLIMITED': 'JBMA.NS',
  'OLECTRA': 'OLECTRA.NS',
  'OLECTRAGREENTECH': 'OLECTRA.NS',
  'OLECTRAGREENTECHLIMITED': 'OLECTRA.NS',
  'TATAPOWER': 'TATAPOWER.NS',
  'TATAPOWERCOLTD': 'TATAPOWER.NS',
  'TATACONSUM': 'TATACONSUM.NS',
  'TATACONSUMERPRODUCTLTD': 'TATACONSUM.NS',
  'TATACONSUMER': 'TATACONSUM.NS',
  'INDHOTEL': 'INDHOTEL.NS',
  'THEINDIANHOTELSCOLTD': 'INDHOTEL.NS',
  'INDIANHOTELS': 'INDHOTEL.NS',
  'MAZDOCK': 'MAZDOCK.NS',
  'MAZAGONDOCKSHIPBUILLTD': 'MAZDOCK.NS',
  'MAZAGONDOCK': 'MAZDOCK.NS',
  'COCHINSHIP': 'COCHINSHIP.NS',
  'COCHINSHIPYARDLIMITED': 'COCHINSHIP.NS',
  'COCHINSHIPYARD': 'COCHINSHIP.NS',
  'ETHOSLTD': 'ETHOSLTD.NS',
  'ETHOSLIMITED': 'ETHOSLTD.NS',
  'ETHOS': 'ETHOSLTD.NS',
  'HYUNDAI': 'HYUNDAI.NS',
  'HYUNDAIMOTORINDIALTD': 'HYUNDAI.NS',
  'HYUNDAIMOTOR': 'HYUNDAI.NS',
  'JKTYRE': 'JKTYRE.NS',
  'JKTYREINDUSTRIESLTD': 'JKTYRE.NS',
  'LGEINDIA': 'LGEINDIA.NS',
  'LGELECTRONICSINDIALTD': 'LGEINDIA.NS',
  'TATAGOLD': 'TATAGOLD.NS',
  'TATAAMLTATAGOLD': 'TATAGOLD.NS'
};

/**
 * Normalizes user/broker symbol input to match official NSE / BSE symbols.
 * Handles company names, clean scrip names, and broker naming conventions (e.g. -EQ, -BE).
 */
export function normalizeSymbol(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Strip spaces, dashes, dots, and common corporate suffixes
  const alphanumericUpper = trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!alphanumericUpper) return '';

  // 1. Direct dictionary match from verified Indian scrips
  if (INDIAN_NAME_MAP[alphanumericUpper]) {
    return INDIAN_NAME_MAP[alphanumericUpper];
  }

  // 2. Suffix stripping (e.g., ACCLIMITED -> ACC, GAILINDIA -> GAIL)
  const strippedSuffix = alphanumericUpper
    .replace(/(LIMITED|LTD|CORP|CORPL|CORPLTD|INDIA|EQ|BE|SM|ST)$/g, '');

  if (INDIAN_NAME_MAP[strippedSuffix]) {
    return INDIAN_NAME_MAP[strippedSuffix];
  }

  // 3. Search STOCK_UNIVERSE
  const universeMatch = STOCK_UNIVERSE.find(
    s => s.symbol.replace('.NS', '').replace('.BO', '') === strippedSuffix ||
         s.name.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(strippedSuffix) ||
         alphanumericUpper.includes(s.symbol.replace('.NS', '').replace('.BO', ''))
  );

  if (universeMatch) return universeMatch.symbol;

  // 4. If already contains an exchange suffix
  if (trimmed.toUpperCase().endsWith('.NS') || trimmed.toUpperCase().endsWith('.BO')) {
    return trimmed.toUpperCase();
  }

  // 5. Default to stripped symbol with .NS
  return `${strippedSuffix || alphanumericUpper}.NS`;
}

/**
 * Helper to extract numeric values from raw table cells, handling currency signs (₹, $, Rs), commas, etc.
 */
function parseNumberCell(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/₹|Rs\.?|\$|,/gi, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Consolidates a list of Buy and Sell orders using standard Weighted Average Cost / FIFO.
 * Computes net remaining shares and the weighted average purchase price of active positions.
 */
export function consolidateOrders(orders: ParsedTradeOrder[]): ParsedHoldingItem[] {
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
  let valueCol = -1;
  let dateCol = -1;
  let orderIdCol = -1;

  // Search first 25 rows for table headers
  for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();

      // Exact match check first for 'symbol' or 'scrip' to prefer dedicated symbol over generic 'stock name'
      if (cell === 'symbol' || cell === 'scrip' || cell === 'instrument' || cell === 'ticker') {
        symbolCol = c;
      } else if (
        symbolCol === -1 &&
        (cell.includes('symbol') ||
         cell.includes('instrument') ||
         cell.includes('scrip') ||
         cell.includes('stock') ||
         cell.includes('security') ||
         cell.includes('company'))
      ) {
        symbolCol = c;
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
        cell === 'value' ||
        cell.includes('turnover') ||
        cell.includes('order value') ||
        cell.includes('trade value') ||
        cell.includes('gross value') ||
        cell.includes('total amount')
      ) {
        if (valueCol === -1) valueCol = c;
      } else if (
        cell.includes('price') ||
        cell.includes('trade price') ||
        cell.includes('avg price') ||
        cell.includes('execution price') ||
        cell.includes('rate') ||
        cell.includes('cost')
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

    if (symbolCol !== -1 && (qtyCol !== -1 || priceCol !== -1 || valueCol !== -1)) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback if header detection was ambiguous
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

    const rawQty = parseNumberCell(row[qtyCol]);

    // Inspect row for valid execution price or calculate from total Value turnover
    let rawPrice = 0;
    const rawVal = valueCol !== -1 ? parseNumberCell(row[valueCol]) : 0;

    if (rawVal > 0 && rawQty > 0) {
      // If broker statement provides total order Value (e.g. Value = ₹141.50 for Qty 10 -> Price = ₹14.15)
      rawPrice = rawVal / rawQty;
    } else if (priceCol !== -1) {
      rawPrice = parseNumberCell(row[priceCol]);
    }

    // If price is still missing or 0, inspect adjacent numeric cells
    if (rawPrice <= 0) {
      for (let c = 0; c < row.length; c++) {
        if (c !== symbolCol && c !== qtyCol && c !== typeCol && c !== orderIdCol && c !== valueCol) {
          const val = parseNumberCell(row[c]);
          if (val > 0.05 && val < 500000 && val !== rawQty) {
            rawPrice = rawQty > 1 && val > rawQty * 10 ? val / rawQty : val;
            break;
          }
        }
      }
    }

    if (rawQty <= 0) continue;

    const normalized = normalizeSymbol(rawSym);

    rawOrders.push({
      symbol: normalized,
      rawSymbol: rawSym,
      type: orderType,
      quantity: Math.round(rawQty),
      price: rawPrice > 0 ? Number(rawPrice.toFixed(2)) : 100,
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

  let headerRowIndex = -1;
  let symbolCol = -1;
  let qtyCol = -1;
  let priceCol = -1;
  let valueCol = -1;

  for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
    const row = jsonData[r] as unknown[];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();
      if (cell === 'symbol' || cell === 'scrip' || cell === 'instrument' || cell === 'ticker') {
        symbolCol = c;
      } else if (
        symbolCol === -1 &&
        (cell.includes('symbol') ||
         cell.includes('instrument') ||
         cell.includes('scrip') ||
         cell.includes('stock') ||
         cell.includes('security') ||
         cell.includes('company'))
      ) {
        symbolCol = c;
      } else if (
        cell.includes('qty') ||
        cell.includes('quantity') ||
        cell.includes('shares') ||
        cell.includes('volume') ||
        cell.includes('available qty')
      ) {
        if (qtyCol === -1) qtyCol = c;
      } else if (
        cell === 'value' ||
        cell.includes('investment') ||
        cell.includes('current val') ||
        cell.includes('total amount')
      ) {
        if (valueCol === -1) valueCol = c;
      } else if (
        cell.includes('buy price') ||
        cell.includes('avg price') ||
        cell.includes('avg. cost') ||
        cell.includes('avg cost') ||
        cell.includes('cost price') ||
        cell.includes('purchase price') ||
        cell.includes('buy avg') ||
        cell.includes('price') ||
        cell.includes('rate')
      ) {
        if (priceCol === -1) priceCol = c;
      }
    }

    if (symbolCol !== -1 && qtyCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

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

    const rawQty = parseNumberCell(row[qtyCol]);
    let rawPrice = 0;
    const rawVal = valueCol !== -1 ? parseNumberCell(row[valueCol]) : 0;

    if (rawVal > 0 && rawQty > 0 && priceCol === -1) {
      rawPrice = rawVal / rawQty;
    } else if (priceCol !== -1) {
      rawPrice = parseNumberCell(row[priceCol]);
    }

    // Fallback scan for price if designated column had 0
    if (rawPrice <= 0) {
      for (let c = 0; c < row.length; c++) {
        if (c !== symbolCol && c !== qtyCol && c !== valueCol) {
          const val = parseNumberCell(row[c]);
          if (val > 0.05 && val < 500000 && val !== rawQty) {
            rawPrice = rawQty > 1 && val > rawQty * 10 ? val / rawQty : val;
            break;
          }
        }
      }
    }

    if (rawQty <= 0) continue;

    const normalized = normalizeSymbol(rawSym);

    results.push({
      symbol: normalized,
      shares: Math.round(rawQty),
      avgBuy: rawPrice > 0 ? Number(rawPrice.toFixed(2)) : 100,
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
