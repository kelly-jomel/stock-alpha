'use client';

import React from 'react';
import { InvestorScores } from '@/types/stock';
import { ShieldCheck, TrendingUp, Compass, Search, Zap, Award, CheckCircle } from 'lucide-react';

interface Props {
  scores: InvestorScores;
}

export default function InvestorDashboard({ scores }: Props) {
  const getBadgeColor = (decision: string) => {
    switch (decision) {
      case 'STRONG BUY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ACCUMULATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NEUTRAL / HOLD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REDUCE / HEDGE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const investors = [
    {
      name: 'Warren Buffett',
      sub: 'Quality Moats & ROIC',
      icon: ShieldCheck,
      color: 'bg-amber-50/70 border-amber-200/80 text-amber-700',
      barColor: 'bg-amber-500',
      data: scores.buffett,
      benchmark: 'Target: ROIC > 15%, D/E < 0.5'
    },
    {
      name: 'Stanley Druckenmiller',
      sub: 'Macro Liquidity & Trend',
      icon: TrendingUp,
      color: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-700',
      barColor: 'bg-emerald-500',
      data: scores.druckenmiller,
      benchmark: 'Target: >50/200 EMA + Bullish Regime'
    },
    {
      name: 'Michael Burry',
      sub: 'Forensic Margin of Safety',
      icon: Search,
      color: 'bg-rose-50/70 border-rose-200/80 text-rose-700',
      barColor: 'bg-rose-500',
      data: scores.burry,
      benchmark: 'Target: Low P/E, High FCF Yield'
    },
    {
      name: 'Ray Dalio',
      sub: 'Economic Machine & Cycles',
      icon: Compass,
      color: 'bg-blue-50/70 border-blue-200/80 text-blue-700',
      barColor: 'bg-blue-500',
      data: scores.dalio,
      benchmark: 'Target: Altman Z > 3.0, Resilience'
    },
    {
      name: 'Cathie Wood',
      sub: "Wright's Law & Disruption",
      icon: Zap,
      color: 'bg-purple-50/70 border-purple-200/80 text-purple-700',
      barColor: 'bg-purple-500',
      data: scores.wood,
      benchmark: 'Target: Disruptive Sector Expansion'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Unified Gate Decision Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-1">
              <Award className="w-4 h-4" /> 5-Gate Unified Market Synthesis
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              Verdict:
              <span className={`px-3 py-0.5 text-xs font-black rounded-lg border ${getBadgeColor(scores.unifiedDecision)}`}>
                {scores.unifiedDecision}
              </span>
            </h2>
            <p className="text-slate-600 text-xs mt-1.5 max-w-2xl leading-relaxed">
              {scores.actionSummary}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl min-w-[210px] justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Composite Alpha Score</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{scores.compositeScore}<span className="text-xs font-normal text-slate-400">/100</span></div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-600 flex items-center justify-center font-bold text-slate-900 text-xs font-mono">
              {scores.compositeScore}%
            </div>
          </div>
        </div>
      </div>

      {/* 5 Legendary Investor Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investors.map((inv) => {
          const Icon = inv.icon;
          return (
            <div
              key={inv.name}
              className={`rounded-2xl border ${inv.color} p-5 flex flex-col justify-between shadow-xs transition-all bg-white`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{inv.name}</h3>
                      <p className="text-[11px] text-slate-400">{inv.sub}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 font-mono">{inv.data.score}</div>
                    <div className="text-[9px] uppercase font-mono tracking-wider text-slate-400">Score</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
                  <div
                    className={`h-full ${inv.barColor} transition-all duration-500`}
                    style={{ width: `${inv.data.score}%` }}
                  />
                </div>

                <div className="mt-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  {inv.data.verdict}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {inv.data.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-[11px] leading-tight">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                {inv.benchmark}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
