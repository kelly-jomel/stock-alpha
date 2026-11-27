import { StockQuote, InvestorScores, TechnicalIndicators } from './stock';

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'US';
  shares: number;
  averageBuyPrice: number;
  currentPrice: number;
  closingPrice?: number;
  currency: string;
  sector: string;
  currentValue: number;
  investedValue: number;
  closingValue?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weightPercent: number;
  asOfDate?: string;
  investorScores?: InvestorScores;
  technicals?: TechnicalIndicators;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  weightedCompositeScore: number;
  holdingsCount: number;
  sectorAllocation: { sector: string; value: number; percent: number }[];
  investorRegimeExposure: {
    buffettMoatPercent: number; // % in quality moat stocks
    druckenmillerBullishPercent: number; // % above 50/200 EMA
    burryValuePercent: number; // % in deep value
    woodGrowthPercent: number; // % in tech/disruption
    dalioResilienceScore: number; // 0-100
  };
  portfolioRiskSummary: {
    riskGrade: 'LOW RISK / ALL-WEATHER' | 'BALANCED MODERATE' | 'HIGH CONCENTRATION' | 'SPECULATIVE / HIGH RISK';
    topOverweightedStock?: string;
    actionableAdvice: string[];
  };
}
