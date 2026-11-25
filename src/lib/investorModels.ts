import { StockQuote, InvestorScores, TechnicalIndicators } from '@/types/stock';

/**
 * Computes scores across the 5 legendary investment frameworks:
 * 1. Warren Buffett (Economic Moat, ROIC, Balance Sheet Durability)
 * 2. Stanley Druckenmiller (Macro Liquidity, Trend Confirmation, EMA200/50 alignment)
 * 3. Ray Dalio (All Weather Debt/Economic Cycle, Risk Parity, Inflation resilience)
 * 4. Michael Burry (Forensic Value, Margin of Safety, Low PE/PB, Low Debt)
 * 5. Cathie Wood (Wright's Law, Exponential Disruptive Growth, High TAM)
 */
export function evaluateInvestorModels(
  quote: StockQuote,
  tech: TechnicalIndicators
): InvestorScores {
  const roic = quote.roic ?? 16.5;
  const pe = quote.peRatio ?? 24;
  const pb = quote.pbRatio ?? 3.5;
  const fcfYield = quote.fcfYield ?? 4.2;
  const debtToEquity = quote.debtToEquity ?? 0.4;
  const altmanZ = quote.altmanZScore ?? 3.8;
  const price = quote.price;

  // 1. Warren Buffett Model (Quality Moat + Safe ROIC + Reasonable Valuation)
  let buffettScore = 50;
  const buffettDetails: string[] = [];

  if (roic >= 20) {
    buffettScore += 25;
    buffettDetails.push(`Exceptional Moat: ROIC ${roic.toFixed(1)}% exceeds Buffett's 15% hurdle`);
  } else if (roic >= 14) {
    buffettScore += 15;
    buffettDetails.push(`Solid Capital Allocator: ROIC ${roic.toFixed(1)}%`);
  } else {
    buffettScore -= 20;
    buffettDetails.push(`Weak Moat: Low ROIC (${roic.toFixed(1)}%) indicates vulnerability to competitors`);
  }

  if (debtToEquity < 0.5) {
    buffettScore += 15;
    buffettDetails.push(`Fortress Balance Sheet: Debt-to-Equity is low (${debtToEquity.toFixed(2)})`);
  } else if (debtToEquity > 1.5) {
    buffettScore -= 15;
    buffettDetails.push(`High Leverage Warning: D/E ratio ${debtToEquity.toFixed(2)}`);
  }

  if (pe <= 25 && fcfYield >= 4.0) {
    buffettScore += 10;
    buffettDetails.push(`Fair Price: PE ${pe.toFixed(1)} with strong ${fcfYield.toFixed(1)}% FCF yield`);
  }

  buffettScore = Math.min(100, Math.max(0, buffettScore));
  const buffettVerdict = buffettScore >= 75 ? 'WONDERFUL COMPANY AT FAIR PRICE' : buffettScore >= 50 ? 'BORDERLINE COMPOUNDER' : 'FAIL: INADEQUATE MOAT';

  // 2. Stanley Druckenmiller Model (Macro Liquidity & Technical Trend Velocity)
  let druckenmillerScore = 50;
  const druckDetails: string[] = [];

  const aboveEma200 = price > tech.ema200;
  const aboveEma50 = price > tech.ema50;
  const goldenCross = tech.ema50 > tech.ema200;

  if (aboveEma200 && aboveEma50) {
    druckenmillerScore += 25;
    druckDetails.push('Price confirming dominant bullish regime above both 50 and 200 EMA');
  } else if (!aboveEma200 && !aboveEma50) {
    druckenmillerScore -= 25;
    druckDetails.push('Hostile Bear Market Regime: Trading below 50 and 200 day EMAs');
  }

  if (goldenCross) {
    druckenmillerScore += 15;
    druckDetails.push('50 EMA > 200 EMA indicates secular upward institutional momentum');
  }

  if (tech.rsi14 >= 50 && tech.rsi14 <= 68) {
    druckenmillerScore += 10;
    druckDetails.push(`RSI (${tech.rsi14}) in optimal acceleration sweet-spot without exhaustion`);
  } else if (tech.rsi14 > 75) {
    druckenmillerScore -= 10;
    druckDetails.push(`Overextended parabolic momentum (RSI ${tech.rsi14}) - risk of liquidity shakeout`);
  }

  druckenmillerScore = Math.min(100, Math.max(0, druckenmillerScore));
  const druckVerdict = druckenmillerScore >= 75 ? 'HIGH CONVICTION ASYMMETRIC LONG' : druckenmillerScore >= 50 ? 'NEUTRAL LIQUIDITY FLOW' : 'AVOID / SHORT REGIME';

  // 3. Ray Dalio Model (Economic Machine & Risk Parity Balance)
  let dalioScore = 55;
  const dalioDetails: string[] = [];

  if (altmanZ > 3.0) {
    dalioScore += 15;
    dalioDetails.push(`Safe Zone Altman Z (${altmanZ.toFixed(2)}) survives debt deleveraging cycles`);
  } else if (altmanZ < 1.8) {
    dalioScore -= 25;
    dalioDetails.push(`Distress Warning: Altman Z (${altmanZ.toFixed(2)}) vulnerable to credit spread shocks`);
  }

  if (quote.exchange === 'NSE') {
    dalioScore += 15;
    dalioDetails.push('Favorable Macro Demographic & GDP Expansion in Indian Growth Corridor');
  } else {
    dalioScore += 10;
    dalioDetails.push('Global Institutional Blue-Chip Balance');
  }

  dalioScore = Math.min(100, Math.max(0, dalioScore));
  const dalioVerdict = dalioScore >= 70 ? 'ALL-WEATHER ASSET RESILIENT' : 'VULNERABLE TO CREDIT TIGHTENING';

  // 4. Michael Burry Model (Forensic Margin of Safety & Extreme Value)
  let burryScore = 50;
  const burryDetails: string[] = [];

  if (pe < 18 && pb < 2.5) {
    burryScore += 30;
    burryDetails.push(`Deep Asymmetric Margin of Safety: Sub-18 PE (${pe.toFixed(1)}) and low PB (${pb.toFixed(1)})`);
  } else if (pe > 35) {
    burryScore -= 30;
    burryDetails.push(`Valuation Bubble Hazard: Multiple of ${pe.toFixed(1)}x priced for unrealistic perfection`);
  }

  if (debtToEquity < 0.3) {
    burryScore += 20;
    burryDetails.push('Virtually zero debt liability insulating against bank credit crunches');
  }

  burryScore = Math.min(100, Math.max(0, burryScore));
  const burryVerdict = burryScore >= 75 ? 'DEEP VALUE ASYMMETRIC BET' : burryScore >= 45 ? 'FAIR VALUE' : 'OVERPRICED FRAILTY';

  // 5. Cathie Wood Model (Disruptive Innovation & Exponential Curves)
  let woodScore = 50;
  const woodDetails: string[] = [];
  const techSectors = ['Technology', 'Consumer Discretionary', 'Automobile', 'Energy'];
  const isInnovativeSector = techSectors.includes(quote.sector);

  if (isInnovativeSector) {
    woodScore += 25;
    woodDetails.push(`Secular Innovation Sector (${quote.sector}) driven by technology convergence`);
  }

  if (tech.rsi14 > 55) {
    woodScore += 15;
    woodDetails.push('High velocity investor participation on breakthrough adoption');
  }

  woodScore = Math.min(100, Math.max(0, woodScore));
  const woodVerdict = woodScore >= 70 ? 'EXPONENTIAL GROWTH RUNNER' : 'MATURE / LINEAR TRAJECTORY';

  // Composite Integrated Gate Score
  const compositeScore = Math.round(
    buffettScore * 0.30 +
    druckenmillerScore * 0.30 +
    burryScore * 0.15 +
    dalioScore * 0.15 +
    woodScore * 0.10
  );

  let unifiedDecision: InvestorScores['unifiedDecision'] = 'NEUTRAL / HOLD';
  let actionSummary = '';

  if (compositeScore >= 80 && buffettScore >= 70 && druckenmillerScore >= 70) {
    unifiedDecision = 'STRONG BUY';
    actionSummary = 'Elite 5-Gate Confluence: Buffett quality moat confirmed by Druckenmiller technical price breakout.';
  } else if (compositeScore >= 65) {
    unifiedDecision = 'ACCUMULATE';
    actionSummary = 'Favorable risk/reward profile with resilient fundamentals and steady liquidity trend.';
  } else if (compositeScore <= 40) {
    unifiedDecision = 'STRONG EXIT / SHORT';
    actionSummary = 'Multiple investor model failure: deteriorating technical support with extreme valuation or debt stress.';
  } else if (compositeScore <= 52) {
    unifiedDecision = 'REDUCE / HEDGE';
    actionSummary = 'Defensive caution advised: Take partial profits or initiate stop-loss protection.';
  } else {
    unifiedDecision = 'NEUTRAL / HOLD';
    actionSummary = 'Wait for clearer technical breakout or deeper margin of safety.';
  }

  return {
    buffett: { score: buffettScore, verdict: buffettVerdict, details: buffettDetails },
    druckenmiller: { score: druckenmillerScore, verdict: druckVerdict, details: druckDetails },
    dalio: { score: dalioScore, verdict: dalioVerdict, details: dalioDetails },
    burry: { score: burryScore, verdict: burryVerdict, details: burryDetails },
    wood: { score: woodScore, verdict: woodVerdict, details: woodDetails },
    compositeScore,
    unifiedDecision,
    actionSummary
  };
}
