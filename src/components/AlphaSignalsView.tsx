'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  Target,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  CheckCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { AlphaSignal, generateAlphaMarketSignals } from '@/lib/alphaScanners';

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function AlphaSignalsView({ onSelectStock }: Props) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const signals = generateAlphaMarketSignals();

  const filtered = signals.filter((s) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'BUY') return s.action.includes('BUY') || s.action === 'ACCUMULATE';
    if (filterType === 'SELL') return s.action.includes('SELL');
    if (filterType === 'DIVERGENCE') return s.signalType.includes('DIVERGENCE');
    if (filterType === 'VOLUME') return s.signalType === 'VOLUME_SHOCKER';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Quantitative Alpha Technical Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            High-Probability Alpha Breakouts & Divergences
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Multi-timeframe scans identifying <strong>RSI Divergences</strong>, <strong>Volume Shockers (&gt;2.5x)</strong>, and <strong>NR7 Volatility Breakouts</strong> with clear Entry, Target, and Stop-Loss levels.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="pt-6 flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Signals' },
            { id: 'BUY', label: '🟢 Buy / Accumulate' },
            { id: 'SELL', label: '🔴 Exit Alerts' },
            { id: 'DIVERGENCE', label: '⚡ RSI Divergences' },
            { id: 'VOLUME', label: '🔥 Volume Shockers' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Scanned Setups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isBuy = item.action.includes('BUY') || item.action === 'ACCUMULATE';
          return (
            <div
              key={item.symbol}
              onClick={() => onSelectStock(item.symbol)}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all hover:border-emerald-400 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {item.symbol.replace('.NS', '')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{item.sector}</span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isBuy
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.action}
                    </span>
                    <div className="text-[11px] font-bold text-slate-500 mt-1">
                      Win Prob: <span className="text-emerald-600 font-black">{item.winProbability}%</span>
                    </div>
                  </div>
                </div>

                {/* Key Technical Setup Tag */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100">
                    {item.signalType.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Vol: <strong className="text-slate-800">{item.volumeMultiplier}x</strong>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    RSI: <strong className="text-slate-800">{item.rsi}</strong>
                  </span>
                </div>

                {/* Setup Rationale */}
                <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {item.rationale}
                </p>
              </div>

              {/* Execution Target & Stop-loss Box */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">LTP</span>
                  <strong className="text-slate-900 font-mono">₹{item.price.toLocaleString('en-IN')}</strong>
                </div>
                <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Target</span>
                  <strong className="text-emerald-800 font-mono">₹{item.targetPrice.toLocaleString('en-IN')}</strong>
                </div>
                <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Stop-Loss</span>
                  <strong className="text-rose-800 font-mono">₹{item.stopLoss.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
