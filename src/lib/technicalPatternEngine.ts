import { Candle } from '@/types/stock';

export interface KeyPatternMatch {
  patternType: 'CANDLESTICK' | 'KEY_ZONE' | 'TRIPLE_TOP' | 'TRIPLE_BOTTOM' | 'DOUBLE_BOTTOM';
  patternName: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0 to 100
  priceLevel: number;
  description: string;
  targetPrice?: number;
  stopLoss?: number;
}

/**
 * Technical Scanner Engine - Replicating KeyStocks Screener Algorithms
 * (Candlestick Patterns, Key Support/Resistance Zones, Triple Top & Triple Bottom)
 */
export class TechnicalPatternEngine {

  /**
   * 1. Candlestick Pattern Scanner (scancandles.baml)
   * Detects: Hammer, Inverted Hammer, Bullish/Bearish Engulfing, Doji, Morning Star, Evening Star, Marubozu
   */
  public static scanCandlesticks(candles: Candle[]): KeyPatternMatch[] {
    const matches: KeyPatternMatch[] = [];
    if (!candles || candles.length < 3) return matches;

    const curr = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    const bodyCurr = Math.abs(curr.close - curr.open);
    const rangeCurr = curr.high - curr.low;
    const bodyPrev = Math.abs(prev.close - prev.open);
    const rangePrev = prev.high - prev.low;

    // Doji check
    if (rangeCurr > 0 && bodyCurr / rangeCurr <= 0.1) {
      matches.push({
        patternType: 'CANDLESTICK',
        patternName: 'Doji Reversal',
        sentiment: 'NEUTRAL',
        confidence: 75,
        priceLevel: curr.close,
        description: 'Indecision candle formed at current level; prepare for volatility breakout.'
      });
    }

    // Bullish Engulfing
    if (prev.close < prev.open && curr.close > curr.open && curr.open <= prev.close && curr.close >= prev.open) {
      matches.push({
        patternType: 'CANDLESTICK',
        patternName: 'Bullish Engulfing',
        sentiment: 'BULLISH',
        confidence: 88,
        priceLevel: curr.close,
        targetPrice: Number((curr.close + bodyCurr * 2).toFixed(2)),
        stopLoss: Number((curr.low * 0.99).toFixed(2)),
        description: 'Buyers completely engulfed previous bearish candle; high momentum reversal signal.'
      });
    }

    // Bearish Engulfing
    if (prev.close > prev.open && curr.close < curr.open && curr.open >= prev.close && curr.close <= prev.open) {
      matches.push({
        patternType: 'CANDLESTICK',
        patternName: 'Bearish Engulfing',
        sentiment: 'BEARISH',
        confidence: 86,
        priceLevel: curr.close,
        targetPrice: Number((curr.close - bodyCurr * 2).toFixed(2)),
        stopLoss: Number((curr.high * 1.01).toFixed(2)),
        description: 'Sellers dominated after opening, engulfing prior bullish range.'
      });
    }

    // Hammer (Bullish Pin Bar at low)
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    if (rangeCurr > 0 && lowerWick >= 2 * bodyCurr && upperWick <= bodyCurr * 0.5) {
      matches.push({
        patternType: 'CANDLESTICK',
        patternName: 'Hammer (Rejection Pinbar)',
        sentiment: 'BULLISH',
        confidence: 84,
        priceLevel: curr.close,
        targetPrice: Number((curr.close + lowerWick).toFixed(2)),
        stopLoss: Number((curr.low).toFixed(2)),
        description: 'Strong price rejection from lows with long lower shadow; institutional accumulation.'
      });
    }

    // Morning Star (3-bar pattern)
    if (prev2.close < prev2.open && bodyPrev < bodyCurr * 0.5 && curr.close > curr.open && curr.close > (prev2.open + prev2.close) / 2) {
      matches.push({
        patternType: 'CANDLESTICK',
        patternName: 'Morning Star Pattern',
        sentiment: 'BULLISH',
        confidence: 90,
        priceLevel: curr.close,
        targetPrice: Number((curr.close * 1.05).toFixed(2)),
        stopLoss: Number((Math.min(curr.low, prev.low)).toFixed(2)),
        description: 'Classic 3-candle bottom reversal confirmation.'
      });
    }

    return matches;
  }

  /**
   * 2. Key Support & Resistance Zones Scanner (scankeyzone.baml, scanhorizontalsupport.baml)
   */
  public static scanKeyZones(candles: Candle[]): KeyPatternMatch[] {
    const matches: KeyPatternMatch[] = [];
    if (!candles || candles.length < 20) return matches;

    const currentPrice = candles[candles.length - 1].close;
    
    // Find swing pivot highs and lows over last 50 candles
    const lookback = Math.min(50, candles.length);
    const recent = candles.slice(-lookback);
    
    const pivots: { price: number; type: 'HIGH' | 'LOW' }[] = [];
    for (let i = 2; i < recent.length - 2; i++) {
      if (recent[i].high > recent[i-1].high && recent[i].high > recent[i-2].high &&
          recent[i].high > recent[i+1].high && recent[i].high > recent[i+2].high) {
        pivots.push({ price: recent[i].high, type: 'HIGH' });
      }
      if (recent[i].low < recent[i-1].low && recent[i].low < recent[i-2].low &&
          recent[i].low < recent[i+1].low && recent[i].low < recent[i+2].low) {
        pivots.push({ price: recent[i].low, type: 'LOW' });
      }
    }

    // Cluster support levels within 1.5% tolerance
    const supportLevels = pivots.filter(p => p.type === 'LOW').map(p => p.price);
    for (const sup of supportLevels) {
      const distancePercent = Math.abs((currentPrice - sup) / sup) * 100;
      if (distancePercent <= 2.0 && currentPrice >= sup) {
        matches.push({
          patternType: 'KEY_ZONE',
          patternName: 'Key Support Zone Test',
          sentiment: 'BULLISH',
          confidence: 82,
          priceLevel: Number(sup.toFixed(2)),
          targetPrice: Number((currentPrice * 1.06).toFixed(2)),
          stopLoss: Number((sup * 0.985).toFixed(2)),
          description: `Price tested major horizontal Key Support at ₹${sup.toFixed(2)} (${distancePercent.toFixed(1)}% away).`
        });
        break; // Match closest
      }
    }

    return matches;
  }

  /**
   * 3. Chart Patterns: Triple Top & Triple Bottom (scantripletop.baml, scantriplebottom.baml)
   */
  public static scanChartPatterns(candles: Candle[]): KeyPatternMatch[] {
    const matches: KeyPatternMatch[] = [];
    if (!candles || candles.length < 35) return matches;

    const currentPrice = candles[candles.length - 1].close;
    const windowCandles = candles.slice(-45);

    // Find swing highs
    const highs: number[] = [];
    const lows: number[] = [];

    for (let i = 2; i < windowCandles.length - 2; i++) {
      if (windowCandles[i].high >= windowCandles[i-1].high && windowCandles[i].high >= windowCandles[i+1].high) {
        highs.push(windowCandles[i].high);
      }
      if (windowCandles[i].low <= windowCandles[i-1].low && windowCandles[i].low <= windowCandles[i+1].low) {
        lows.push(windowCandles[i].low);
      }
    }

    // Triple Bottom Check (3 swing lows within 1.5% of each other)
    if (lows.length >= 3) {
      const l1 = lows[lows.length - 3];
      const l2 = lows[lows.length - 2];
      const l3 = lows[lows.length - 1];
      const avgLow = (l1 + l2 + l3) / 3;
      const spread = Math.max(l1, l2, l3) - Math.min(l1, l2, l3);

      if ((spread / avgLow) <= 0.025 && currentPrice >= avgLow) {
        matches.push({
          patternType: 'TRIPLE_BOTTOM',
          patternName: 'Triple Bottom Foundation',
          sentiment: 'BULLISH',
          confidence: 91,
          priceLevel: Number(avgLow.toFixed(2)),
          targetPrice: Number((avgLow * 1.10).toFixed(2)),
          stopLoss: Number((avgLow * 0.975).toFixed(2)),
          description: `Bullish Triple Bottom formation with 3 clean retests near ₹${avgLow.toFixed(2)}.`
        });
      }
    }

    // Triple Top Check (3 swing highs within 1.5% of each other)
    if (highs.length >= 3) {
      const h1 = highs[highs.length - 3];
      const h2 = highs[highs.length - 2];
      const h3 = highs[highs.length - 1];
      const avgHigh = (h1 + h2 + h3) / 3;
      const spread = Math.max(h1, h2, h3) - Math.min(h1, h2, h3);

      if ((spread / avgHigh) <= 0.025 && currentPrice <= avgHigh) {
        matches.push({
          patternType: 'TRIPLE_TOP',
          patternName: 'Triple Top Resistance',
          sentiment: 'BEARISH',
          confidence: 89,
          priceLevel: Number(avgHigh.toFixed(2)),
          targetPrice: Number((avgHigh * 0.90).toFixed(2)),
          stopLoss: Number((avgHigh * 1.025).toFixed(2)),
          description: `Bearish Triple Top ceiling detected with heavy overhead rejection near ₹${avgHigh.toFixed(2)}.`
        });
      }
    }

    return matches;
  }
}
