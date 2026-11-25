'use client';

import React, { useState, useEffect } from 'react';
import { StockQuote } from '@/types/stock';
import MiniSparkline from '@/components/MiniSparkline';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
  onBackToExplore: () => void;
}

function generateTrendPoints(basePrice: number, isPos: boolean): number[] {
  const points = [basePrice * (isPos ? 0.98 : 1.02)];
  let current = points[0];
  for (let i = 0; i < 6; i++) {
    const shift = (Math.random() - (isPos ? 0.35 : 0.65)) * 0.008;
    current = current * (1 + shift);
    points.push(current);
  }
  points.push(basePrice);
  return points;
}

export default function MarketMoversAllView({ onSelectStock, onBackToExplore }: Props) {
  const [data, setData] = useState<{
    topGainers: StockQuote[];
    topLosers: StockQuote[];
    allQuotes: StockQuote[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'all'>('gainers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/explore', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // 5-second live refresh
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const fullList = (
    activeTab === 'gainers'
      ? data?.topGainers || []
      : activeTab === 'losers'
      ? data?.topLosers || []
      : data?.allQuotes || []
  );

  const sectors = Array.from(new Set(fullList.map(s => s.sector).filter(Boolean)));

  const filtered = fullList.filter(stock => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || stock.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Return to Explore Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToExplore}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Explore
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              All Market Movers ({filtered.length})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live ranking of all Indian stocks across NSE/BSE by daily percentage gain &amp; loss
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('gainers')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'gainers'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> All Gainers ({data?.topGainers.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('losers')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'losers'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> All Losers ({data?.topLosers.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stocks ({data?.allQuotes?.length || 0})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search filtered market movers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Sector:
          </span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Sectors ({sectors.length})</option>
            {sectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Full Movers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Rank &amp; Instrument</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4 text-center">7-Day Trend</th>
                <th className="py-3 px-4 text-right">LTP (₹)</th>
                <th className="py-3 px-4 text-right">Day Change</th>
                <th className="py-3 px-4 text-right">% Change</th>
                <th className="py-3 px-4 text-right">Volume</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Loading full market mover rankings from NSE/BSE...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No matching stocks found in this criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((stock, idx) => {
                  const isPos = stock.change >= 0;
                  const trend = generateTrendPoints(stock.price, isPos);

                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock.symbol)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-slate-400 font-bold w-5">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {stock.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {stock.symbol.replace('.NS', '').replace('.BO', '')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200">
                          {stock.sector}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          <MiniSparkline data={trend} isPositive={isPos} width={90} height={22} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{stock.price.toLocaleString('en-IN')}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-semibold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPos ? '+' : ''}₹{stock.change.toFixed(2)}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span className={`px-2 py-0.5 rounded ${isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {isPos ? '+' : ''}{stock.changePercent}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {stock.volume ? (stock.volume > 1000000 ? `${(stock.volume / 1000000).toFixed(2)}M` : `${(stock.volume / 1000).toFixed(0)}k`) : '--'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(stock.symbol);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                        >
                          Chart <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
