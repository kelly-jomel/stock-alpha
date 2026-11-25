import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE, fetchStockQuote, fetchStockCandles } from '@/lib/stockData';
import { detectTechnicalIndicators } from '@/lib/indicators';
import { evaluateInvestorModels } from '@/lib/investorModels';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const universe = searchParams.get('universe') || 'NSE_ALL';
  const investorFilter = searchParams.get('investorFilter') || 'ALL';
  const minScore = Number(searchParams.get('minScore') || 0);
  const maSetup = searchParams.get('maSetup') || 'ALL';
  const rsiCondition = searchParams.get('rsiCondition') || 'ALL';
  const patternCondition = searchParams.get('patternCondition') || 'ALL';

  // Filter universe
  let targetItems = STOCK_UNIVERSE.filter(s => s.symbol !== '^NSEI');
  if (universe === 'NIFTY_50') {
    targetItems = targetItems.slice(0, 15);
  } else if (universe === 'MID_SMALL') {
    targetItems = targetItems.slice(15);
  }

  // Scan items
  const results = await Promise.all(
    targetItems.map(async item => {
      const quote = await fetchStockQuote(item.symbol);
      const candles = await fetchStockCandles(item.symbol, '6mo');
      const technicals = detectTechnicalIndicators(candles);
      const investorScores = evaluateInvestorModels(quote, technicals);
      return { quote, technicals, investorScores };
    })
  );

  // Apply filters
  const filtered = results.filter(({ quote, technicals, investorScores }) => {
    // 1. Min Composite or Investor Score
    if (minScore > 0 && investorScores.compositeScore < minScore) return false;

    // 2. Specific Investor filter
    if (investorFilter === 'BUFFETT' && investorScores.buffett.score < 70) return false;
    if (investorFilter === 'DRUCKENMILLER' && investorScores.druckenmiller.score < 70) return false;
    if (investorFilter === 'BURRY' && investorScores.burry.score < 70) return false;
    if (investorFilter === 'DALIO' && investorScores.dalio.score < 65) return false;
    if (investorFilter === 'WOOD' && investorScores.wood.score < 65) return false;

    // 3. Moving Average setup (Alpha feature)
    if (maSetup === 'MA_CONVERGENCE' && !technicals.maConvergence.isConverging) return false;
    if (maSetup === 'ABOVE_200EMA' && quote.price < technicals.ema200) return false;
    if (maSetup === 'GOLDEN_CROSS' && technicals.ema50 < technicals.ema200) return false;

    // 4. RSI Condition
    if (rsiCondition === 'OVERSOLD' && technicals.rsi14 >= 35) return false;
    if (rsiCondition === 'OVERBOUGHT' && technicals.rsi14 <= 70) return false;
    if (rsiCondition === 'BULLISH_MOMENTUM' && (technicals.rsi14 < 50 || technicals.rsi14 > 68)) return false;

    // 5. Pattern & Alpha Setup Condition
    if (patternCondition === 'BREAKOUT' && !technicals.patternsDetected.some(p => p.name.includes('Breakout'))) return false;
    if (patternCondition === 'DOUBLE_BOTTOM' && !technicals.patternsDetected.some(p => p.name.includes('Double Bottom'))) return false;
    if (patternCondition === 'TRIPLE_BOTTOM' && !technicals.patternsDetected.some(p => p.name.includes('Triple Bottom') || p.name.includes('Double Bottom'))) return false;
    if (patternCondition === 'TRIPLE_TOP' && !technicals.patternsDetected.some(p => p.name.includes('Triple Top') || p.name.includes('Resistance'))) return false;
    if (patternCondition === 'KEY_ZONE' && !technicals.patternsDetected.some(p => p.name.includes('Support') || p.name.includes('Key Zone') || p.name.includes('Bounce'))) return false;
    if (patternCondition === 'HARMONIC_ABCD' && !technicals.patternsDetected.some(p => p.name.includes('Harmonic') || p.name.includes('ABCD'))) return false;
    if (patternCondition === 'WOLFE_WAVE' && !technicals.patternsDetected.some(p => p.name.includes('Wolfe Wave'))) return false;
    if (patternCondition === 'FIB_BOUNCE' && !technicals.patternsDetected.some(p => p.name.includes('Fibonacci') || p.name.includes('Fib'))) return false;
    if (patternCondition === 'CANDLE_BULLISH' && !technicals.patternsDetected.some(p => p.name.includes('Hammer') || p.name.includes('Engulfing'))) return false;
    if (patternCondition === 'GAP_UP' && (!technicals.gaps?.hasGap || technicals.gaps.type !== 'GAP_UP')) return false;
    if (patternCondition === 'GAP_DOWN' && (!technicals.gaps?.hasGap || technicals.gaps.type !== 'GAP_DOWN')) return false;
    if (patternCondition === 'PIVOT_BREAKOUT' && (!technicals.pivots || quote.price <= technicals.pivots.classic.r1)) return false;

    return true;
  });

  return NextResponse.json({
    totalScanned: targetItems.length,
    matchedCount: filtered.length,
    results: filtered
  });
}
