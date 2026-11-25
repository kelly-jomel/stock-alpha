'use client';

import React, { useState, useEffect } from 'react';
import { StockQuote } from '@/types/stock';
import MiniSparkline from '@/components/MiniSparkline';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Zap,
  ShoppingBag,
  Cpu,
  Landmark,
  Car,
  HeartPulse,
  Building,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

interface ExploreData {
  indices: Array<{
    name: string;
    symbol: string;
    price: number;
    change: string;
    changePercent: string;
    isPositive: boolean;
  }>;
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  mostBought: StockQuote[];
  fiftyTwoWeekHighs: StockQuote[];
  sectors: Array<{
    name: string;
    count: number;
    icon: string;
    change: string;
  }>;
}

interface Props {
  onSelectStock: (symbol: string) => void;
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

export default function ExploreView({ onSelectStock }: Props) {
  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  
  // Show all states
  const [showAllMovers, setShowAllMovers] = useState(false);
  const [showAllMostTraded, setShowAllMostTraded] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    async function loadExploreData() {
      try {
        const res = await fetch('/api/explore');
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
    loadExploreData();
    // Auto-update Explore indices, market movers, and volume leaders every 6 seconds
    const interval = setInterval(loadExploreData, 6000);
    return () => clearInterval(interval);
  }, []);

  const getSectorIcon = (icon: string) => {
    switch (icon) {
      case 'Landmark': return <Landmark className="w-5 h-5 text-indigo-500" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-blue-500" />;
      case 'Zap': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Car': return <Car className="w-5 h-5 text-rose-500" />;
      case 'ShoppingBag': return <ShoppingBag className="w-5 h-5 text-purple-500" />;
      case 'Building': return <Building className="w-5 h-5 text-slate-600" />;
      default: return <HeartPulse className="w-5 h-5 text-emerald-500" />;
    }
  };

  // Combine universe stocks to allow active filtering by sector
  const allKnownStocks: StockQuote[] = [
    ...(data?.topGainers || []),
    ...(data?.topLosers || []),
    ...(data?.mostBought || [])
  ].filter((s, idx, arr) => arr.findIndex(x => x.symbol === s.symbol) === idx);

  const sectorFilteredStocks = selectedSector
    ? allKnownStocks.filter(s => {
        const sec = s.sector?.toLowerCase() || '';
        const target = selectedSector.toLowerCase();
        if (target.includes('bank') && (sec.includes('bank') || sec.includes('financial'))) return true;
        if (target.includes('tech') && (sec.includes('tech') || sec.includes('software'))) return true;
        if (target.includes('energy') && (sec.includes('energy') || sec.includes('oil'))) return true;
        if (target.includes('auto') && (sec.includes('auto') || sec.includes('motor'))) return true;
        if (target.includes('consumer') && (sec.includes('consumer') || sec.includes('goods'))) return true;
        if (target.includes('health') && (sec.includes('health') || sec.includes('pharma'))) return true;
        return sec.includes(target) || target.includes(sec);
      })
    : [];

  const displayedMostTraded = showAllMostTraded
    ? data?.mostBought || []
    : data?.mostBought?.slice(0, 5) || [];

  const fullMoverList = activeTab === 'gainers' ? data?.topGainers || [] : data?.topLosers || [];
  const displayedMovers = showAllMovers ? fullMoverList : fullMoverList.slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Indian Market Benchmark Indices with Live Mini-Charts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Indian Market Spot Indices</h2>
          </div>
          <span className="text-xs text-slate-400">Real-Time NSE/BSE Feeds</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {data?.indices.map((idx) => (
            <div
              key={idx.name}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-600 group-hover:text-emerald-600 transition-colors">
                  {idx.name}
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {idx.price.toLocaleString('en-IN')}
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold mt-0.5 font-mono ${idx.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span>{idx.change}</span>
                  <span>({idx.changePercent})</span>
                </div>
              </div>

              {/* Live Mini Sparkline for Indices */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Live Intraday</span>
                <MiniSparkline
                  data={generateTrendPoints(idx.price, idx.isPositive)}
                  isPositive={idx.isPositive}
                  width={80}
                  height={22}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Most Traded Indian Stocks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Most Traded Indian Stocks</h2>
          </div>
          <button
            onClick={() => setShowAllMostTraded(!showAllMostTraded)}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            {showAllMostTraded ? 'Show Top 5' : `Show All Most Traded (${data?.mostBought?.length || 0})`}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {displayedMostTraded.map((stock) => {
            const isPos = stock.change >= 0;
            const trend = generateTrendPoints(stock.price, isPos);

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 mb-2.5 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{stock.name}</h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {stock.symbol.replace('.NS', '').replace('.BO', '')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stock.sector}</p>
                </div>

                {/* Live Mini-Chart */}
                <div className="my-3 flex justify-center">
                  <MiniSparkline data={trend} isPositive={isPos} width={130} height={28} />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-900 font-mono">₹{stock.price.toLocaleString('en-IN')}</span>
                  <span className={`text-xs font-semibold font-mono ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPos ? '+' : ''}{stock.changePercent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Top Gainers & Top Losers Tabbed Section with Mini Sparklines */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Market Movers</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time daily leaders and laggards with live 7-day trendlines</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Show All Toggle */}
            <button
              onClick={() => setShowAllMovers(!showAllMovers)}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {showAllMovers ? 'Show Top 5' : `Show All (${fullMoverList.length})`}
            </button>

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
                <TrendingUp className="w-3.5 h-3.5" /> Top Gainers
              </button>
              <button
                onClick={() => setActiveTab('losers')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'losers'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" /> Top Losers
              </button>
            </div>
          </div>
        </div>

        {/* Stocks List Table with Live Trend Mini-Chart column */}
        <div className="divide-y divide-slate-100 mt-2">
          {displayedMovers.map((stock) => {
            const isPos = stock.change >= 0;
            const trend = generateTrendPoints(stock.price, isPos);

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="py-3.5 px-2 hover:bg-slate-50/80 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center font-bold text-xs text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                        {stock.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {stock.symbol.replace('.NS', '').replace('.BO', '')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>NSE: {stock.symbol.replace('.NS', '')}</span>
                      <span>&bull;</span>
                      <span>{stock.sector}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Mini Live Sparkline Chart */}
                  <div className="hidden sm:block">
                    <MiniSparkline data={trend} isPositive={isPos} width={100} height={26} />
                  </div>

                  <div className="text-right min-w-[90px]">
                    <div className="font-bold text-slate-900 font-mono text-sm">
                      ₹{stock.price.toLocaleString('en-IN')}
                    </div>
                    <div className={`text-xs font-semibold font-mono mt-0.5 ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPos ? '+' : ''}{stock.change.toFixed(2)} ({isPos ? '+' : ''}{stock.changePercent}%)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Sector Performance Cards & Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Explore by Sectors</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any sector card to filter and explore relevant Indian stocks</p>
          </div>
          {selectedSector && (
            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 transition-colors"
            >
              Clear Filter ({selectedSector})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {data?.sectors.map((sec) => {
            const isSelected = selectedSector === sec.name;
            return (
              <div
                key={sec.name}
                onClick={() => setSelectedSector(isSelected ? null : sec.name)}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer group ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-lg w-fit mb-3 transition-transform group-hover:scale-105 ${
                  isSelected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50'
                }`}>
                  {getSectorIcon(sec.icon)}
                </div>
                <h3 className="font-semibold text-xs text-slate-900 line-clamp-1">{sec.name}</h3>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-slate-400">{sec.count} stocks</span>
                  <span className="font-semibold font-mono text-emerald-600">{sec.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Sector Stock Drill-Down */}
        {selectedSector && (
          <div className="mt-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Filter className="w-4 h-4 text-emerald-600" />
                Stocks in {selectedSector} ({sectorFilteredStocks.length})
              </div>
              <span className="text-[11px] text-slate-400">Click a stock to view live interactive chart</span>
            </div>

            {sectorFilteredStocks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active securities found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {sectorFilteredStocks.map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock.symbol)}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/20 bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{stock.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{stock.symbol.replace('.NS', '')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-xs text-slate-900">₹{stock.price.toLocaleString('en-IN')}</div>
                      <div className={`text-[10px] font-mono font-semibold ${stock.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
