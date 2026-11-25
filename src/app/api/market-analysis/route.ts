import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE, fetchStockQuote, fetchStockCandles } from '@/lib/stockData';
import { detectTechnicalIndicators } from '@/lib/indicators';
import { evaluateInvestorModels } from '@/lib/investorModels';
import { StockQuote, TechnicalIndicators, InvestorScores } from '@/types/stock';

export interface MarketRegimeStatus {
  regime: 'EXPANSIONARY / RISK-ON' | 'SELECTIVE / QUALITY-LEAD' | 'DEFENSIVE / TRANSITION' | 'CONTRACTIONARY / RISK-OFF';
  benchmarkSymbol: string;
  benchmarkPrice: number;
  benchmarkChangePercent: number;
  macroLiquidityScore: number; // 0-100 (Druckenmiller & Dalio indicator)
  marketBreadthPercentAbove200EMA: number;
  averageCompositeScore: number;
  summary: string;
}

export interface StockRecommendation {
  quote: StockQuote;
  technicals: TechnicalIndicators;
  investorScores: InvestorScores;
  convictionTier: 'TIER 1: HIGH CONVICTION BUY (ALL-GATE)' | 'TIER 2: ACCUMULATE ON PULLBACK' | 'TIER 3: SPECULATIVE ALPHA';
  gateChecklist: {
    buffettMoat: boolean;
    druckenmillerTrend: boolean;
    burryMarginOfSafety: boolean;
    dalioResilience: boolean;
    woodInnovation: boolean;
  };
  catalystReasons: string[];
  suggestedEntry: number;
  targetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: string;
}

export async function GET() {
  try {
    // 1. Scan the whole universe
    const scanned = await Promise.all(
      STOCK_UNIVERSE.map(async (item) => {
        const quote = await fetchStockQuote(item.symbol);
        const candles = await fetchStockCandles(item.symbol, '6mo');
        const technicals = detectTechnicalIndicators(candles);
        const investorScores = evaluateInvestorModels(quote, technicals);
        return { quote, technicals, investorScores };
      })
    );

    // 2. Compute Market Regime Dynamics (Druckenmiller / Dalio Top-Down Gate)
    const benchmarkItem = scanned.find(s => s.quote.symbol === '^NSEI') || scanned[0];
    const totalEquities = scanned.filter(s => s.quote.symbol !== '^NSEI');

    const countAbove200EMA = totalEquities.filter(s => s.quote.price > s.technicals.ema200).length;
    const marketBreadthPercent = totalEquities.length > 0 ? Math.round((countAbove200EMA / totalEquities.length) * 100) : 50;
    const avgComposite = Math.round(totalEquities.reduce((acc, s) => acc + s.investorScores.compositeScore, 0) / (totalEquities.length || 1));

    let regime: MarketRegimeStatus['regime'] = 'SELECTIVE / QUALITY-LEAD';
    let summary = '';

    if (marketBreadthPercent >= 70 && benchmarkItem.quote.changePercent >= -0.5) {
      regime = 'EXPANSIONARY / RISK-ON';
      summary = 'Macro liquidity is favorable with over 70% of securities holding institutional support above the 200 EMA. Druckenmiller & Dalio momentum indicators confirm risk-on capital deployment.';
    } else if (marketBreadthPercent >= 45) {
      regime = 'SELECTIVE / QUALITY-LEAD';
      summary = 'Selective consolidation regime. Broader indices are range-bound; alpha is concentrated in high-ROIC Buffett compounders and stocks with tight KeyStocks moving average squeezes.';
    } else {
      regime = 'DEFENSIVE / TRANSITION';
      summary = 'Defensive market posture. High volatility with deteriorating technical breadth. High cash buffers and strict stop-loss adherence recommended.';
    }

    const marketStatus: MarketRegimeStatus = {
      regime,
      benchmarkSymbol: benchmarkItem.quote.name,
      benchmarkPrice: benchmarkItem.quote.price,
      benchmarkChangePercent: benchmarkItem.quote.changePercent,
      macroLiquidityScore: Math.min(95, Math.max(30, Math.round(marketBreadthPercent * 0.8 + 20))),
      marketBreadthPercentAbove200EMA: marketBreadthPercent,
      averageCompositeScore: avgComposite,
      summary
    };

    // 3. Filter and Rank Top Stock Recommendations Based on Combined Principles
    const recommendations: StockRecommendation[] = totalEquities
      .map(({ quote, technicals, investorScores }) => {
        const buffettMoat = investorScores.buffett.score >= 65;
        const druckenmillerTrend = investorScores.druckenmiller.score >= 65;
        const burryMarginOfSafety = investorScores.burry.score >= 50;
        const dalioResilience = investorScores.dalio.score >= 60;
        const woodInnovation = investorScores.wood.score >= 55;

        const composite = investorScores.compositeScore;
        let convictionTier: StockRecommendation['convictionTier'] = 'TIER 2: ACCUMULATE ON PULLBACK';

        if (composite >= 75 && buffettMoat && druckenmillerTrend) {
          convictionTier = 'TIER 1: HIGH CONVICTION BUY (ALL-GATE)';
        } else if (woodInnovation && druckenmillerTrend && composite >= 65) {
          convictionTier = 'TIER 3: SPECULATIVE ALPHA';
        } else {
          convictionTier = 'TIER 2: ACCUMULATE ON PULLBACK';
        }

        // Build specific synthesized catalysts
        const catalystReasons: string[] = [];
        if (buffettMoat) {
          catalystReasons.push(`Buffett Moat: ROIC of ${quote.roic}% with low debt-to-equity (${quote.debtToEquity})`);
        }
        if (druckenmillerTrend) {
          catalystReasons.push(`Druckenmiller Trend: Price (₹${quote.price}) leading above 50 and 200 EMA`);
        }
        if (technicals.maConvergence.isConverging) {
          catalystReasons.push(`KeyStocks Energy Squeeze: 20/50/200 EMAs compressed within ${technicals.maConvergence.spreadPercent}%`);
        }
        if (technicals.patternsDetected.length > 0) {
          catalystReasons.push(`Pattern: ${technicals.patternsDetected[0].name} (${technicals.patternsDetected[0].confidence}% confidence)`);
        }
        if (burryMarginOfSafety) {
          catalystReasons.push(`Burry Value: Reasonable valuation multiple (${quote.peRatio}x P/E, ${quote.fcfYield}% FCF yield)`);
        }

        const suggestedEntry = quote.price;
        const stopLossPrice = Number((technicals.supportResistance.supports[0] || quote.price * 0.94).toFixed(1));
        const targetPrice = Number((quote.price + (quote.price - stopLossPrice) * 2.5).toFixed(1));
        const risk = quote.price - stopLossPrice;
        const reward = targetPrice - quote.price;
        const riskRewardRatio = risk > 0 ? `1 : ${(reward / risk).toFixed(1)}` : '1 : 2.5';

        return {
          quote,
          technicals,
          investorScores,
          convictionTier,
          gateChecklist: {
            buffettMoat,
            druckenmillerTrend,
            burryMarginOfSafety,
            dalioResilience,
            woodInnovation
          },
          catalystReasons,
          suggestedEntry,
          targetPrice,
          stopLossPrice,
          riskRewardRatio
        };
      })
      .sort((a, b) => b.investorScores.compositeScore - a.investorScores.compositeScore);

    return NextResponse.json({
      marketStatus,
      topBuys: recommendations.filter(r => r.investorScores.compositeScore >= 60),
      allRanked: recommendations
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
