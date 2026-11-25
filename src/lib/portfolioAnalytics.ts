import { PortfolioHolding, PortfolioAnalytics } from '@/types/portfolio';

export function calculatePortfolioAnalytics(holdings: PortfolioHolding[]): PortfolioAnalytics {
  if (holdings.length === 0) {
    return {
      totalInvested: 0,
      totalCurrentValue: 0,
      totalUnrealizedPnL: 0,
      totalUnrealizedPnLPercent: 0,
      weightedCompositeScore: 0,
      holdingsCount: 0,
      sectorAllocation: [],
      investorRegimeExposure: {
        buffettMoatPercent: 0,
        druckenmillerBullishPercent: 0,
        burryValuePercent: 0,
        woodGrowthPercent: 0,
        dalioResilienceScore: 0
      },
      portfolioRiskSummary: {
        riskGrade: 'BALANCED MODERATE',
        actionableAdvice: ['Add your holdings to view real-time diagnostics and investor stress tests.']
      }
    };
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalUnrealizedPnL = totalCurrentValue - totalInvested;
  const totalUnrealizedPnLPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  // Sector breakdown
  const sectorMap: { [key: string]: number } = {};
  holdings.forEach(h => {
    sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.currentValue;
  });

  const sectorAllocation = Object.entries(sectorMap)
    .map(([sector, value]) => ({
      sector,
      value: Number(value.toFixed(2)),
      percent: Number(((value / (totalCurrentValue || 1)) * 100).toFixed(1))
    }))
    .sort((a, b) => b.percent - a.percent);

  // Weighted investor composite score
  let weightedScoreSum = 0;
  let buffettValue = 0;
  let druckValue = 0;
  let burryValue = 0;
  let woodValue = 0;
  let dalioSum = 0;

  holdings.forEach(h => {
    const weight = totalCurrentValue > 0 ? h.currentValue / totalCurrentValue : 0;
    const scores = h.investorScores;
    if (scores) {
      weightedScoreSum += scores.compositeScore * weight;
      if (scores.buffett.score >= 70) buffettValue += h.currentValue;
      if (scores.druckenmiller.score >= 70) druckValue += h.currentValue;
      if (scores.burry.score >= 70) burryValue += h.currentValue;
      if (scores.wood.score >= 65) woodValue += h.currentValue;
      dalioSum += scores.dalio.score * weight;
    }
  });

  const buffettMoatPercent = Number(((buffettValue / (totalCurrentValue || 1)) * 100).toFixed(1));
  const druckenmillerBullishPercent = Number(((druckValue / (totalCurrentValue || 1)) * 100).toFixed(1));
  const burryValuePercent = Number(((burryValue / (totalCurrentValue || 1)) * 100).toFixed(1));
  const woodGrowthPercent = Number(((woodValue / (totalCurrentValue || 1)) * 100).toFixed(1));

  // Risk Diagnostics
  const actionableAdvice: string[] = [];
  const maxHolding = [...holdings].sort((a, b) => b.currentValue - a.currentValue)[0];
  const maxHoldingPercent = totalCurrentValue > 0 ? (maxHolding.currentValue / totalCurrentValue) * 100 : 0;

  let riskGrade: PortfolioAnalytics['portfolioRiskSummary']['riskGrade'] = 'BALANCED MODERATE';

  if (maxHoldingPercent > 35) {
    riskGrade = 'HIGH CONCENTRATION';
    actionableAdvice.push(
      `Extreme concentration risk in ${maxHolding.symbol} (${maxHoldingPercent.toFixed(1)}% of portfolio). Buffett and Dalio advise trimming any single position exceeding 25-30% to prevent single-stock tail risk.`
    );
  }

  if (druckenmillerBullishPercent < 40) {
    actionableAdvice.push(
      `Over 60% of your capital is in securities trading below their 50/200-day moving averages. Druckenmiller's rule: avoid fighting downward institutional momentum.`
    );
  }

  if (buffettMoatPercent >= 60) {
    actionableAdvice.push(
      `High Buffett Moat allocation (${buffettMoatPercent}%): Portfolio is anchored by durable compounders with strong ROIC and cash flows.`
    );
  } else {
    actionableAdvice.push(
      `Moat deficit: Under 50% of your portfolio clears Warren Buffett's 15% ROIC hurdle. Consider replacing low-ROIC laggards with quality compounders.`
    );
  }

  if (woodGrowthPercent > 50 && burryValuePercent < 15) {
    riskGrade = 'SPECULATIVE / HIGH RISK';
    actionableAdvice.push(
      `High Cathie Wood thematic growth tilt (${woodGrowthPercent}%) with negligible Burry margin of safety. Portfolio is vulnerable to sharp drawdowns if interest rates or discount factors rise.`
    );
  }

  if (riskGrade === 'BALANCED MODERATE' && dalioSum > 65) {
    riskGrade = 'LOW RISK / ALL-WEATHER';
  }

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
    totalUnrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
    totalUnrealizedPnLPercent: Number(totalUnrealizedPnLPercent.toFixed(2)),
    weightedCompositeScore: Math.round(weightedScoreSum),
    holdingsCount: holdings.length,
    sectorAllocation,
    investorRegimeExposure: {
      buffettMoatPercent,
      druckenmillerBullishPercent,
      burryValuePercent,
      woodGrowthPercent,
      dalioResilienceScore: Math.round(dalioSum)
    },
    portfolioRiskSummary: {
      riskGrade,
      topOverweightedStock: maxHoldingPercent > 30 ? `${maxHolding.symbol} (${maxHoldingPercent.toFixed(1)}%)` : undefined,
      actionableAdvice
    }
  };
}
