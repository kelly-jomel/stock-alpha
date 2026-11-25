export interface Candle {
  time: string; // 'YYYY-MM-DD'
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'US';
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  peRatio?: number;
  pbRatio?: number;
  marketCap?: number;
  roic?: number;
  fcfYield?: number;
  debtToEquity?: number;
  altmanZScore?: number;
  sector: string;
}

export interface InvestorScores {
  buffett: { score: number; verdict: string; details: string[] };
  druckenmiller: { score: number; verdict: string; details: string[] };
  dalio: { score: number; verdict: string; details: string[] };
  burry: { score: number; verdict: string; details: string[] };
  wood: { score: number; verdict: string; details: string[] };
  compositeScore: number;
  unifiedDecision: 'STRONG BUY' | 'ACCUMULATE' | 'NEUTRAL / HOLD' | 'REDUCE / HEDGE' | 'STRONG EXIT / SHORT';
  actionSummary: string;
}

export interface TechnicalIndicators {
  rsi14: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  ema200: number;
  maConvergence: {
    spreadPercent: number; // percentage difference between max and min of key MAs
    isConverging: boolean;
    description: string;
  };
  patternsDetected: {
    name: string;
    type: 'bullish' | 'bearish' | 'neutral';
    description: string;
    confidence: number;
  }[];
  supportResistance: {
    supports: number[];
    resistances: number[];
  };
}

export interface ScannerFilterParams {
  universe?: 'NSE_ALL' | 'NIFTY_50' | 'MID_SMALL' | 'US_TECH';
  investorFilter?: 'ALL' | 'BUFFETT' | 'DRUCKENMILLER' | 'BURRY' | 'WOOD' | 'DALIO';
  minInvestorScore?: number;
  maSetup?: 'ALL' | 'GOLDEN_CROSS' | 'MA_CONVERGENCE' | 'ABOVE_200EMA' | 'SLOPE_UP';
  rsiCondition?: 'ALL' | 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH_MOMENTUM';
  patternCondition?: 'ALL' | 'DOUBLE_BOTTOM' | 'BREAKOUT' | 'HARMONIC_ABCD' | 'WOLFE_WAVE';
  minMarketCap?: number;
}
