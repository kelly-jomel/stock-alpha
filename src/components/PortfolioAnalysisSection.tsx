'use client';

import React from 'react';
import { PortfolioHolding, PortfolioAnalytics } from '@/types/portfolio';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  BarChart3,
  Scale,
  Sparkles,
  ArrowUpRight,
  Shield,
  Layers
} from 'lucide-react';

interface Props {
  holdings: PortfolioHolding[];
  analytics: PortfolioAnalytics;
  onSelectStock: (symbol: string) => void;
}

export function getStockSignal(holding: PortfolioHolding): {
  action: 'BUY' | 'ACCUMULATE' | 'HOLD' | 'REDUCE' | 'SELL';
  color: string;
  bgColor: string;
  borderColor: string;
  reason: string;
} {
  const pnlPercent = holding.unrealizedPnLPercent;
  const score = holding.investorScores?.compositeScore ?? 65;
  const decision = holding.investorScores?.unifiedDecision;

  if (decision === 'STRONG BUY' || (score >= 78 && pnlPercent > -15)) {
    return {
      action: 'BUY',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      reason: 'Strong fundamental quality & bullish momentum alignment.'
    };
  }

  if (decision === 'ACCUMULATE' || (score >= 68 && pnlPercent >= 0)) {
    return {
      action: 'ACCUMULATE',
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      reason: 'Attractive compounder, accumulate on market dips.'
    };
  }

  if (decision === 'STRONG EXIT / SHORT' || (score < 45 && pnlPercent < -25)) {
    return {
      action: 'SELL',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      reason: 'Weakening fundamentals and capital erosion; protect downside.'
    };
  }

  if (decision === 'REDUCE / HEDGE' || holding.weightPercent > 25) {
    return {
      action: 'REDUCE',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      reason: holding.weightPercent > 25
        ? 'Position exceeds safe concentration limit (>25%). Trim to rebalance.'
        : 'Take partial profits or hedge to manage volatility.'
    };
  }

  return {
    action: 'HOLD',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    reason: 'Solid risk-reward; maintain current allocation.'
  };
}

export default function PortfolioAnalysisSection({ holdings, analytics, onSelectStock }: Props) {
  if (holdings.length === 0) return null;

  // Signal counts
  const signals = holdings.map(h => ({ holding: h, signal: getStockSignal(h) }));
  const buyCount = signals.filter(s => s.signal.action === 'BUY' || s.signal.action === 'ACCUMULATE').length;
  const holdCount = signals.filter(s => s.signal.action === 'HOLD').length;
  const sellCount = signals.filter(s => s.signal.action === 'SELL' || s.signal.action === 'REDUCE').length;

  // Winners and Losers
  const topGainer = [...holdings].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent)[0];
  const topDrag = [...holdings].sort((a, b) => a.unrealizedPnLPercent - b.unrealizedPnLPercent)[0];

  // Diversification health check
  const maxWeight = Math.max(...holdings.map(h => h.weightPercent), 0);
  const isConcentrated = maxWeight > 25;

  return (
    <div className="space-y-6">
      {/* Diagnostic Health Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Portfolio Health &amp; Signals Analysis</h2>
              <p className="text-xs text-slate-500">
                Institutional analysis, actionable BUY/SELL/HOLD ratings &amp; diversification check
              </p>
            </div>
          </div>

          {/* Quick Signal Summary Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
              {buyCount} BUY / ACCUMULATE
            </span>
            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
              {holdCount} HOLD
            </span>
            <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold font-mono">
              {sellCount} SELL / REDUCE
            </span>
          </div>
        </div>

        {/* 3 Key Health Dimensions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* 1. Diversification Health */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-indigo-600" /> Diversification
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isConcentrated ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isConcentrated ? 'High Concentration' : 'Well Diversified'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isConcentrated
                ? `Single largest stock holds ${maxWeight}% of portfolio. Ray Dalio & Buffett suggest capping single holdings at 20-25%.`
                : `Balanced across ${holdings.length} stocks and ${analytics.sectorAllocation.length} sectors with healthy capital dispersion.`}
            </p>
          </div>

          {/* 2. Top Performer & Drag */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Return Drivers
            </div>
            <div className="space-y-1 text-xs">
              {topGainer && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Top Winner:</span>
                  <span className="font-mono font-bold text-emerald-600 cursor-pointer hover:underline" onClick={() => onSelectStock(topGainer.symbol)}>
                    {topGainer.symbol.replace('.NS', '')} (+{topGainer.unrealizedPnLPercent}%)
                  </span>
                </div>
              )}
              {topDrag && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Top Drag:</span>
                  <span className="font-mono font-bold text-rose-600 cursor-pointer hover:underline" onClick={() => onSelectStock(topDrag.symbol)}>
                    {topDrag.symbol.replace('.NS', '')} ({topDrag.unrealizedPnLPercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Overall Quality Score */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-600" /> Fundamental Moat
              </span>
              <span className="font-mono font-bold text-xs text-indigo-700">
                {analytics.weightedCompositeScore}/100
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {analytics.weightedCompositeScore >= 70
                ? 'High-quality bluechip anchor with proven return on invested capital (>15% ROIC).'
                : 'Contains high-beta growth/cyclical names. Monitor earnings and debt levels.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Signals Card Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" /> Actionable Recommendations per Holding
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Algorithmically calculated using valuation, momentum, and concentration limits
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {signals.map(({ holding, signal }) => (
            <div
              key={holding.id}
              onClick={() => onSelectStock(holding.symbol)}
              className="p-4 rounded-xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-xs transition-all cursor-pointer bg-white flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-emerald-600 transition-colors">
                      {holding.symbol.replace('.NS', '')}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{holding.name}</p>
                  </div>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${signal.bgColor} ${signal.color} ${signal.borderColor}`}>
                    {signal.action}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  {signal.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Weight: <strong>{holding.weightPercent}%</strong></span>
                <span className={holding.unrealizedPnL >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {holding.unrealizedPnL >= 0 ? '+' : ''}{holding.unrealizedPnLPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
