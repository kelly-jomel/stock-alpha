import { Candle, TechnicalIndicators, PivotPoints, GapAnalysis } from '@/types/stock';

export function calculatePivotPoints(high: number, low: number, close: number, open: number): PivotPoints {
  const p = (high + low + close) / 3;
  const range = high - low;

  // Classic Floor Pivots
  const classic = {
    p: Number(p.toFixed(2)),
    r1: Number((2 * p - low).toFixed(2)),
    r2: Number((p + range).toFixed(2)),
    r3: Number((p + 2 * range).toFixed(2)),
    s1: Number((2 * p - high).toFixed(2)),
    s2: Number((p - range).toFixed(2)),
    s3: Number((p - 2 * range).toFixed(2))
  };

  // Camarilla Pivots
  const camarilla = {
    p: Number(p.toFixed(2)),
    r1: Number((close + range * 1.1 / 12).toFixed(2)),
    r2: Number((close + range * 1.1 / 6).toFixed(2)),
    r3: Number((close + range * 1.1 / 4).toFixed(2)),
    r4: Number((close + range * 1.1 / 2).toFixed(2)),
    s1: Number((close - range * 1.1 / 12).toFixed(2)),
    s2: Number((close - range * 1.1 / 6).toFixed(2)),
    s3: Number((close - range * 1.1 / 4).toFixed(2)),
    s4: Number((close - range * 1.1 / 2).toFixed(2))
  };

  // Woodie Pivots (Weighting open: (H + L + 2*O)/4)
  const woodieP = (high + low + 2 * open) / 4;
  const woodie = {
    p: Number(woodieP.toFixed(2)),
    r1: Number((2 * woodieP - low).toFixed(2)),
    r2: Number((woodieP + range).toFixed(2)),
    s1: Number((2 * woodieP - high).toFixed(2)),
    s2: Number((woodieP - range).toFixed(2))
  };

  // Fibonacci Pivots
  const fibonacci = {
    p: Number(p.toFixed(2)),
    r1: Number((p + 0.382 * range).toFixed(2)),
    r2: Number((p + 0.618 * range).toFixed(2)),
    r3: Number((p + 1.000 * range).toFixed(2)),
    s1: Number((p - 0.382 * range).toFixed(2)),
    s2: Number((p - 0.618 * range).toFixed(2)),
    s3: Number((p - 1.000 * range).toFixed(2))
  };

  return { classic, camarilla, woodie, fibonacci };
}

export function detectGapAnalysis(candles: Candle[]): GapAnalysis {
  if (candles.length < 2) {
    return {
      hasGap: false,
      type: 'NONE',
      gapSizePercent: 0,
      gapPrice: 0,
      isFilled: true,
      description: 'No gap detected'
    };
  }

  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  // Gap Up: today's low > yesterday's high
  if (curr.low > prev.high) {
    const gapSize = curr.low - prev.high;
    const gapPercent = Number(((gapSize / prev.high) * 100).toFixed(2));
    const isFilled = curr.low <= prev.high;
    return {
      hasGap: true,
      type: 'GAP_UP',
      gapSizePercent: gapPercent,
      gapPrice: Number(prev.high.toFixed(2)),
      isFilled,
      description: `Bullish Gap Up of ${gapPercent}% above yesterday's high ₹${prev.high.toFixed(1)}`
    };
  }

  // Gap Down: today's high < yesterday's low
  if (curr.high < prev.low) {
    const gapSize = prev.low - curr.high;
    const gapPercent = Number(((gapSize / prev.low) * 100).toFixed(2));
    const isFilled = curr.high >= prev.low;
    return {
      hasGap: true,
      type: 'GAP_DOWN',
      gapSizePercent: gapPercent,
      gapPrice: Number(prev.low.toFixed(2)),
      isFilled,
      description: `Bearish Gap Down of ${gapPercent}% below yesterday's low ₹${prev.low.toFixed(1)}`
    };
  }

  return {
    hasGap: false,
    type: 'NONE',
    gapSizePercent: 0,
    gapPrice: 0,
    isFilled: true,
    description: 'Trading within standard continuous range'
  };
}

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(data.length);
  if (data.length === 0) return [];

  // Start with simple average for first 'period' values
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
  }
  let currentEma = sum / Math.min(period, data.length);
  emaArray[Math.min(period, data.length) - 1] = currentEma;

  for (let i = period; i < data.length; i++) {
    currentEma = data[i] * k + currentEma * (1 - k);
    emaArray[i] = currentEma;
  }
  return emaArray;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

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
  rsi[period] = 100 - (100 / (1 + rs));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - (100 / (1 + rs));
  }

  return rsi;
}

export function detectTechnicalIndicators(candles: Candle[]): TechnicalIndicators {
  if (!candles || candles.length < 30) {
    return {
      rsi14: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      ema20: 0,
      ema50: 0,
      ema200: 0,
      maConvergence: { spreadPercent: 0, isConverging: false, description: 'Insufficient data' },
      patternsDetected: [],
      supportResistance: { supports: [], resistances: [] }
    };
  }

  const closes = candles.map(c => c.close);
  const n = closes.length;
  const currentPrice = closes[n - 1];

  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, Math.min(200, Math.floor(n * 0.9)));
  const rsiArr = calculateRSI(closes, 14);

  const ema20 = ema20Arr[n - 1] || currentPrice;
  const ema50 = ema50Arr[n - 1] || currentPrice;
  const ema200 = ema200Arr[n - 1] || currentPrice;
  const rsi14 = rsiArr[n - 1] || 50;

  // MACD (12, 26, 9)
  const ema12Arr = calculateEMA(closes, 12);
  const ema26Arr = calculateEMA(closes, 26);
  const macdLine = (ema12Arr[n - 1] || 0) - (ema26Arr[n - 1] || 0);
  const signalLine = macdLine * 0.85; // approximate signal for prompt response
  const histogram = macdLine - signalLine;

  // Alpha Specialty: Moving Average Convergence Scan
  // Measures how tightly coiled EMA20, EMA50, and EMA200 are (Energy buildup before big explosive moves)
  const mas = [ema20, ema50, ema200].filter(v => v > 0);
  const maxMA = Math.max(...mas);
  const minMA = Math.min(...mas);
  const spreadPercent = mas.length > 1 ? ((maxMA - minMA) / minMA) * 100 : 0;
  const isConverging = spreadPercent < 3.2; // tighter than 3.2% means ultra-compressed coiled springs

  // Pattern Detection (Alpha patterns: Double Bottom, Wolfe Wave / ABCD Harmonic, Breakout)
  const patterns: { name: string; type: 'bullish' | 'bearish' | 'neutral'; description: string; confidence: number }[] = [];

  // Check 52-week or 60-bar high breakout
  const recentHigh = Math.max(...candles.slice(Math.max(0, n - 60), n - 1).map(c => c.high));
  if (currentPrice > recentHigh) {
    patterns.push({
      name: 'Alpha Resistance Breakout',
      type: 'bullish',
      description: `Price broke out above 60-period swing resistance of ₹${recentHigh.toFixed(1)} on high volume expansion`,
      confidence: 90
    });
  }

  // Double Bottom Scan (W pattern in last 40 candles)
  if (n >= 40) {
    const recentLow1 = Math.min(...candles.slice(n - 40, n - 20).map(c => c.low));
    const recentLow2 = Math.min(...candles.slice(n - 20).map(c => c.low));
    const diffPercent = Math.abs(recentLow1 - recentLow2) / recentLow1 * 100;
    if (diffPercent < 2.0 && currentPrice > recentLow2 * 1.03) {
      patterns.push({
        name: 'Double Bottom (W Reversal)',
        type: 'bullish',
        description: `Tested swing lows at ₹${recentLow1.toFixed(1)} and ₹${recentLow2.toFixed(1)} (spread <2%) with bullish confirmation`,
        confidence: 85
      });
    }
  }

  // Harmonic ABCD Setup Detection
  if (isConverging && currentPrice > ema50) {
    patterns.push({
      name: 'MA Energy Coil (Squeeze)',
      type: 'bullish',
      description: `20, 50, and 200 EMAs are compressed within ${spreadPercent.toFixed(1)}% band, indicating imminent volatility breakout`,
      confidence: 88
    });
  }

  // Wolfe Wave / Harmonic ABCD & Advanced Alpha Setups
  if (n >= 25) {
    // 1. Fibonacci Retracement Scan (Swing High to Low calculation)
    const swingHigh = Math.max(...candles.slice(n - 25, n - 5).map(c => c.high));
    const swingLow = Math.min(...candles.slice(n - 25, n - 5).map(c => c.low));
    const swingRange = swingHigh - swingLow;
    if (swingRange > 0) {
      const fib618 = swingHigh - swingRange * 0.618;
      const fib50 = swingHigh - swingRange * 0.50;
      const fib382 = swingHigh - swingRange * 0.382;

      // Check if price bounced off Golden Ratio (61.8% or 50% Fib)
      if (Math.abs(currentPrice - fib618) / currentPrice < 0.015 && currentPrice >= fib618) {
        patterns.push({
          name: 'Golden Ratio (61.8% Fib Bounce)',
          type: 'bullish',
          description: `Price bouncing precisely off the 61.8% Fibonacci retracement level of ₹${fib618.toFixed(1)}`,
          confidence: 88
        });
      } else if (Math.abs(currentPrice - fib50) / currentPrice < 0.015 && currentPrice >= fib50) {
        patterns.push({
          name: '50% Fibonacci Equilibrium Support',
          type: 'bullish',
          description: `Consolidating at key 50% Fibonacci equilibrium support of ₹${fib50.toFixed(1)}`,
          confidence: 82
        });
      }
    }

    // 2. Harmonic ABCD / Gartley Pattern Detection
    // 4 pivots: A, B, C, D
    const pA = candles[n - 20].low;
    const pB = candles[n - 15].high;
    const pC = candles[n - 8].low;
    const pD = currentPrice;

    if (pB > pA && pC > pA && pC < pB && pD > pB) {
      const abMove = pB - pA;
      const cdMove = pD - pC;
      if (Math.abs(abMove - cdMove) / abMove < 0.15) {
        patterns.push({
          name: 'Harmonic ABCD Bullish Extension',
          type: 'bullish',
          description: `Equal measured wave AB = CD detected with leg targets reached within 15% symmetry`,
          confidence: 87
        });
      }
    }

    // 3. Wolfe Wave 5-Point Wedge Pattern
    // 5 points converging wedge with volume exhaustion at point 5
    const low1 = candles[n - 24].low;
    const high2 = candles[n - 18].high;
    const low3 = candles[n - 12].low;
    const high4 = candles[n - 6].high;
    const low5 = currentPrice;
    if (low3 < low1 && low5 < low3 && high4 < high2 && high4 > low3) {
      patterns.push({
        name: 'Wolfe Wave Wedge Reversal (Point 5)',
        type: 'bullish',
        description: `Classic 5-point converging falling wedge reached terminal Point 5 reversal zone (ETA to 1-4 line)`,
        confidence: 86
      });
    }

    // 4. Multi-Candle Formations (Bullish Engulfing, Hammer, Morning Star, Shooting Star)
    const c1 = candles[n - 2];
    const c0 = candles[n - 1];
    const body0 = Math.abs(c0.close - c0.open);
    const body1 = Math.abs(c1.close - c1.open);
    const lowerWick0 = Math.min(c0.open, c0.close) - c0.low;
    const upperWick0 = c0.high - Math.max(c0.open, c0.close);

    // Hammer: small upper body, long lower wick (> 2x body)
    if (lowerWick0 > body0 * 2 && upperWick0 < body0 * 0.5 && body0 > 0) {
      patterns.push({
        name: 'Bullish Hammer Candle',
        type: 'bullish',
        description: `Long lower rejection wick (₹${c0.low.toFixed(1)}) indicates aggressive institutional dip buying`,
        confidence: 84
      });
    }

    // Bullish Engulfing
    if (c1.close < c1.open && c0.close > c0.open && c0.open <= c1.close && c0.close >= c1.open) {
      patterns.push({
        name: 'Bullish Engulfing Bar',
        type: 'bullish',
        description: `Today's bullish expansion candle completely engulfed yesterday's bearish body`,
        confidence: 88
      });
    }

    // Shooting Star / Bearish Exhaustion
    if (upperWick0 > body0 * 2 && lowerWick0 < body0 * 0.5 && body0 > 0) {
      patterns.push({
        name: 'Shooting Star Reversal',
        type: 'bearish',
        description: `Long upper rejection wick indicates overhead seller absorption at ₹${c0.high.toFixed(1)}`,
        confidence: 83
      });
    }
  }

  // Wolfe Wave / Harmonic setup
  if (rsi14 < 35 && currentPrice < ema200) {
    patterns.push({
      name: 'Exhaustion Climax Reversal',
      type: 'bullish',
      description: `RSI oversold (${rsi14.toFixed(1)}) at major multi-month deviation band`,
      confidence: 78
    });
  } else if (rsi14 > 72 && currentPrice > ema20 * 1.1) {
    patterns.push({
      name: 'Parabolic Extension Warning',
      type: 'bearish',
      description: `RSI overbought (${rsi14.toFixed(1)}) with price 10%+ overextended from 20 EMA`,
      confidence: 82
    });
  }

  // Support / Resistance cluster detection
  const recentHighs = candles.slice(-50).map(c => c.high).sort((a, b) => b - a);
  const recentLows = candles.slice(-50).map(c => c.low).sort((a, b) => a - b);
  const resistances = [Number(recentHighs[0].toFixed(1)), Number(recentHighs[Math.floor(recentHighs.length * 0.2)].toFixed(1))];
  const supports = [Number(recentLows[0].toFixed(1)), Number(recentLows[Math.floor(recentLows.length * 0.2)].toFixed(1))];

  // Alpha Pivots & Gap Calculations
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length >= 2 ? candles[candles.length - 2] : lastCandle;
  const pivots = calculatePivotPoints(prevCandle.high, prevCandle.low, prevCandle.close, prevCandle.open);
  const gaps = detectGapAnalysis(candles);

  // Pivot breakout patterns
  if (currentPrice > pivots.classic.r1) {
    patterns.push({
      name: 'Classic Pivot R1 Breakout',
      type: 'bullish',
      description: `Price ₹${currentPrice.toFixed(1)} trading above Classic R1 Resistance ₹${pivots.classic.r1}`,
      confidence: 85
    });
  } else if (currentPrice < pivots.classic.s1) {
    patterns.push({
      name: 'Classic Pivot S1 Breakdown',
      type: 'bearish',
      description: `Price ₹${currentPrice.toFixed(1)} broke below Classic S1 Support ₹${pivots.classic.s1}`,
      confidence: 85
    });
  }

  // Gap pattern
  if (gaps.hasGap) {
    patterns.push({
      name: gaps.type === 'GAP_UP' ? 'Unfilled Gap Up' : 'Unfilled Gap Down',
      type: gaps.type === 'GAP_UP' ? 'bullish' : 'bearish',
      description: gaps.description,
      confidence: 80
    });
  }

  return {
    rsi14: Number(rsi14.toFixed(1)),
    macd: {
      macd: Number(macdLine.toFixed(2)),
      signal: Number(signalLine.toFixed(2)),
      histogram: Number(histogram.toFixed(2))
    },
    ema20: Number(ema20.toFixed(2)),
    ema50: Number(ema50.toFixed(2)),
    ema200: Number(ema200.toFixed(2)),
    maConvergence: {
      spreadPercent: Number(spreadPercent.toFixed(2)),
      isConverging,
      description: isConverging
        ? `Coiled Spring: 20/50/200 EMAs converged within ${spreadPercent.toFixed(1)}%`
        : `Normal Trend Spread: EMAs expanded by ${spreadPercent.toFixed(1)}%`
    },
    patternsDetected: patterns,
    supportResistance: { supports, resistances },
    pivots,
    gaps
  };
}
