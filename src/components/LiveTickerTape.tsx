'use client';

import React, { useEffect, useState } from 'react';
import { StockQuote } from '@/types/stock';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function LiveTickerTape({ onSelectStock }: Props) {
  const [stocks, setStocks] = useState<StockQuote[]>([
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', exchange: 'NSE', currency: 'INR', price: 1370.7, change: 7.7, changePercent: 0.56, open: 1365, high: 1375, low: 1360, volume: 5400000, sector: 'Energy' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', currency: 'INR', price: 2507.8, change: 128.3, changePercent: 5.39, open: 2420, high: 2520, low: 2400, volume: 1800000, sector: 'Technology' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', exchange: 'NSE', currency: 'INR', price: 843.0, change: 11.2, changePercent: 1.35, open: 835, high: 845, low: 830, volume: 4200000, sector: 'Banking' },
    { symbol: 'INFY.NS', name: 'Infosys', exchange: 'NSE', currency: 'INR', price: 1146.0, change: 24.5, changePercent: 2.18, open: 1125, high: 1150, low: 1120, volume: 3100000, sector: 'Technology' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', exchange: 'NSE', currency: 'INR', price: 795.0, change: 14.8, changePercent: 1.90, open: 785, high: 800, low: 780, volume: 2900000, sector: 'Automobile' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', exchange: 'NSE', currency: 'INR', price: 1270.0, change: 18.0, changePercent: 1.44, open: 1255, high: 1275, low: 1250, volume: 2500000, sector: 'Banking' }
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function loadTickerData() {
      try {
        const res = await fetch('/api/explore');
        if (res.ok) {
          const data = await res.json();
          const allQuotes = [
            ...(data.topGainers || []),
            ...(data.mostBought || [])
          ];
          // Deduplicate
          const uniqueMap = new Map<string, StockQuote>();
          allQuotes.forEach(q => {
            if (!uniqueMap.has(q.symbol)) uniqueMap.set(q.symbol, q);
          });
          if (!isCancelled) {
            setStocks(Array.from(uniqueMap.values()));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadTickerData();
    // Auto-refresh quotes every 15 seconds
    const interval = setInterval(loadTickerData, 15000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (stocks.length === 0) return null;

  return (
    <div className="bg-white border-b border-slate-200/80 overflow-hidden py-1.5 px-4 text-xs font-mono shadow-2xs">
      <div className="flex items-center space-x-6 animate-none overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-slate-200 text-slate-500 font-sans font-bold text-[11px] uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>NSE Live</span>
        </div>

        {stocks.map((s) => {
          const isPos = s.change >= 0;
          return (
            <div
              key={s.symbol}
              onClick={() => onSelectStock(s.symbol)}
              className="flex items-center space-x-2 shrink-0 cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded-md transition-colors group"
            >
              <span className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                {s.symbol.replace('.NS', '')}
              </span>
              <span className="font-bold text-slate-900">
                ₹{s.price.toLocaleString('en-IN')}
              </span>
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPos ? '+' : ''}{s.changePercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
