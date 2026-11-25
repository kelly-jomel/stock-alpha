'use client';

import React, { useState } from 'react';
import PortfolioView from '@/components/PortfolioView';
import RecommendationsView from '@/components/RecommendationsView';
import { Wallet, Sparkles, PieChart, ShieldCheck } from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function UnifiedPortfolioHub({ onSelectStock }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'recommendations'>('holdings');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in">
      {/* Top Segmented Sub-Navbar for Portfolio & AI Recommendations */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('holdings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'holdings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>My Portfolio &amp; Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'recommendations'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Allocation &amp; Recommendations</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium pr-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Real-time NSE Portfolio Analytics</span>
        </div>
      </div>

      {/* Subpage 1: Active Portfolio & Diagnostics */}
      {activeSubTab === 'holdings' && (
        <PortfolioView onSelectStock={onSelectStock} />
      )}

      {/* Subpage 2: Smart Recommendations & Capital Allocator */}
      {activeSubTab === 'recommendations' && (
        <RecommendationsView onSelectStock={onSelectStock} />
      )}
    </div>
  );
}
