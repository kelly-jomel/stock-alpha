'use client';

import React, { useState, useEffect } from 'react';
import { MarketRegimeStatus, StockRecommendation } from '@/app/api/market-analysis/route';
import {
  Compass,
  TrendingUp,
  Award,
  ShieldCheck,
  Zap,
  Target,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  BarChart3,
  Layers,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function MarketAnalysisView({ onSelectStock }: Props) {
  const [data, setData] = useState<{
    marketStatus: MarketRegimeStatus;
    topBuys: StockRecommendation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER1' | 'TIER2' | 'TIER3'>('ALL');

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market-analysis');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const filteredRecommendations = data?.topBuys.filter((item) => {
    if (tierFilter === 'TIER1') return item.convictionTier.includes('TIER 1');
    if (tierFilter === 'TIER2') return item.convictionTier.includes('TIER 2');
    if (tierFilter === 'TIER3') return item.convictionTier.includes('TIER 3');
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Market Macro Regime (Dalio + Druckenmiller Gate) */}
      {data?.marketStatus && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-indigo-500/20">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
                <Compass className="w-4 h-4" /> Top-Down Macro Regime Gate (Dalio & Druckenmiller)
              </div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                Market Condition:
                <span className={`px-3.5 py-1 text-sm font-black rounded-lg border ${
                  data.marketStatus.regime === 'EXPANSIONARY / RISK-ON'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : data.marketStatus.regime === 'SELECTIVE / QUALITY-LEAD'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {data.marketStatus.regime}
                </span>
              </h1>
            </div>

            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Signals
            </button>
          </div>

          <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-4xl">
            {data.marketStatus.summary}
          </p>

          {/* Core Macro Indicators Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Benchmark ({data.marketStatus.benchmarkSymbol})</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                ₹{data.marketStatus.benchmarkPrice.toLocaleString()}
              </div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${data.marketStatus.benchmarkChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.marketStatus.benchmarkChangePercent >= 0 ? '+' : ''}{data.marketStatus.benchmarkChangePercent}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Market Breadth (&gt;200 EMA)</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {data.marketStatus.marketBreadthPercentAbove200EMA}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Institutions defending baseline</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Macro Liquidity Score</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
                {data.marketStatus.macroLiquidityScore} <span className="text-xs text-slate-500 font-normal">/100</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Central bank flow velocity</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Universe Quality Health</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {data.marketStatus.averageCompositeScore} <span className="text-xs text-slate-500 font-normal">/100</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Average 5-Gate Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Stocks Section Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-black text-white">Top Stock Recommendations (5-Gate Confluence)</h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tierFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Opportunities ({data?.topBuys.length || 0})
          </button>
          <button
            onClick={() => setTierFilter('TIER1')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tierFilter === 'TIER1' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Tier 1: High Conviction
          </button>
          <button
            onClick={() => setTierFilter('TIER2')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tierFilter === 'TIER2' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-400'
            }`}
          >
            Tier 2: Accumulate
          </button>
          <button
            onClick={() => setTierFilter('TIER3')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tierFilter === 'TIER3' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-purple-400'
            }`}
          >
            Tier 3: Speculative Alpha
          </button>
        </div>
      </div>

      {/* Stock Recommendation Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse font-medium">
          Running 5-Gate Investor Synthesis across securities...
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          No securities currently match this conviction tier.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRecommendations.map((rec) => {
            const isTier1 = rec.convictionTier.includes('TIER 1');
            const isTier3 = rec.convictionTier.includes('TIER 3');

            return (
              <div
                key={rec.quote.symbol}
                className={`rounded-2xl border bg-slate-900 p-6 flex flex-col justify-between shadow-xl transition-all hover:border-indigo-500/50 ${
                  isTier1 ? 'border-emerald-500/40' : isTier3 ? 'border-purple-500/30' : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Stock Name, Conviction Tier, Price */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">{rec.quote.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {rec.quote.symbol}
                        </span>
                      </div>
                      <span className={`inline-block mt-2 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        isTier1
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isTier3
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {rec.convictionTier}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">
                        {rec.quote.currency === 'USD' ? '$' : '₹'}{rec.quote.price}
                      </div>
                      <div className="text-xs font-mono font-bold text-indigo-400 mt-0.5">
                        Score: {rec.investorScores.compositeScore}/100
                      </div>
                    </div>
                  </div>

                  {/* 5-Gate Verification Checklist */}
                  <div className="mt-4">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">5-Gate Confluence Matrix:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                        rec.gateChecklist.buffettMoat ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Buffett Moat
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                        rec.gateChecklist.druckenmillerTrend ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Druckenmiller Trend
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                        rec.gateChecklist.burryMarginOfSafety ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Burry Margin
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                        rec.gateChecklist.dalioResilience ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Dalio Resilience
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                        rec.gateChecklist.woodInnovation ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Wood Innovation
                      </div>

                      <div className="p-2 rounded-lg border bg-indigo-950/40 border-indigo-500/30 text-indigo-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" /> KeyStocks Squeeze
                      </div>
                    </div>
                  </div>

                  {/* Why to Buy (Catalysts & Principles) */}
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Core Investment Catalysts:</div>
                    {rec.catalystReasons.slice(0, 3).map((reason, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade Setup: Entry, Stop-Loss, Target Price */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono mb-4">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">Suggested Entry</div>
                      <div className="font-bold text-white mt-0.5">₹{rec.suggestedEntry}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <div className="text-[10px] text-rose-400 uppercase">Stop Loss (Floor)</div>
                      <div className="font-bold text-rose-400 mt-0.5">₹{rec.stopLossPrice}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <div className="text-[10px] text-emerald-400 uppercase">Target (R:R {rec.riskRewardRatio})</div>
                      <div className="font-bold text-emerald-400 mt-0.5">₹{rec.targetPrice}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Sector: <strong className="text-white">{rec.quote.sector}</strong>
                    </span>
                    <button
                      onClick={() => onSelectStock(rec.quote.symbol)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20"
                    >
                      Inspect in Terminal <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
