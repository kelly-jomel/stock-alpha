export interface IndicatorDataPoint {
  time: string;
  value: number;
}

export interface BollingerBandPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

// 1. Simple Moving Average (SMA)
export function calculateSMA(closes: number[], period: number): number[] {
  const result: number[] = new Array(closes.length).fill(0);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) {
      sum -= closes[i - period];
      result[i] = Number((sum / period).toFixed(2));
    } else if (i === period - 1) {
      result[i] = Number((sum / period).toFixed(2));
    } else {
      result[i] = closes[i];
    }
  }
  return result;
}

// 2. Bollinger Bands (20, 2)
export function calculateBollingerBands(
  times: string[],
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandPoint[] {
  const sma = calculateSMA(closes, period);
  const bands: BollingerBandPoint[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      bands.push({
        time: times[i],
        upper: closes[i],
        middle: closes[i],
        lower: closes[i]
      });
      continue;
    }

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(closes[j] - sma[i], 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    bands.push({
      time: times[i],
      upper: Number((sma[i] + multiplier * stdDev).toFixed(2)),
      middle: Number(sma[i].toFixed(2)),
      lower: Number((sma[i] - multiplier * stdDev).toFixed(2))
    });
  }
  return bands;
}

// 3. SuperTrend Indicator (10, 3)
export interface SuperTrendPoint {
  time: string;
  value: number;
  direction: 'UP' | 'DOWN';
}

export function calculateSuperTrend(
  times: string[],
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 10,
  multiplier: number = 3
): SuperTrendPoint[] {
  const result: SuperTrendPoint[] = [];
  if (closes.length === 0) return result;

  // True Range
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // ATR
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrs: number[] = new Array(closes.length).fill(0);
  atrs[period - 1] = atr;
  for (let i = period; i < closes.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    atrs[i] = atr;
  }

  let direction: 'UP' | 'DOWN' = 'UP';
  let prevUpper = 0;
  let prevLower = 0;

  for (let i = 0; i < closes.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    const currentAtr = atrs[i] || tr[i];
    let basicUpper = hl2 + multiplier * currentAtr;
    let basicLower = hl2 - multiplier * currentAtr;

    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (i > 0) {
      finalUpper = basicUpper < prevUpper || closes[i - 1] > prevUpper ? basicUpper : prevUpper;
      finalLower = basicLower > prevLower || closes[i - 1] < prevLower ? basicLower : prevLower;
    }

    if (i === 0) {
      direction = 'UP';
    } else if (closes[i] > prevUpper) {
      direction = 'UP';
    } else if (closes[i] < prevLower) {
      direction = 'DOWN';
    }

    prevUpper = finalUpper;
    prevLower = finalLower;

    result.push({
      time: times[i],
      value: Number((direction === 'UP' ? finalLower : finalUpper).toFixed(2)),
      direction
    });
  }

  return result;
}

// 4. Relative Strength Index (RSI 14)
export function calculateRSIFull(
  times: string[],
  closes: number[],
  period: number = 14
): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  if (closes.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: times[period], value: Number((100 - (100 / (1 + rs))).toFixed(2)) });

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: times[i], value: Number((100 - (100 / (1 + rs))).toFixed(2)) });
  }

  return result;
}
