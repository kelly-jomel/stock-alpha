'use client';

import React, { useState, useEffect } from 'react';
import StockChart from '@/components/StockChart';
import InvestorDashboard from '@/components/InvestorDashboard';
import KeyStockScanner from '@/components/KeyStockScanner';
import PortfolioView from '@/components/PortfolioView';
import ExploreView from '@/components/ExploreView';
import RecommendationsView from '@/components/RecommendationsView';
import LiveTickerTape from '@/components/LiveTickerTape';
import { StockQuote, Candle, TechnicalIndicators, InvestorScores } from '@/types/stock';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import {
  Compass,
  Sparkles,
  Wallet,
  LineChart,
  Sliders,
  BookOpen,
  Search,
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE.NS');
  const [activeTab, setActiveTab] = useState<'explore' | 'recommendations' | 'portfolio' | 'terminal' | 'screener'>('explore');
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<string>('1y');
  const [interval, setInterval] = useState<string>('1d');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [investorScores, setInvestorScores] = useState<InvestorScores | null>(null);

  // Fetch full data for selected symbol
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock?symbol=${encodeURIComponent(selectedSymbol)}&range=${range}&interval=${interval}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setQuote(data.quote);
            setCandles(data.candles);
            setTechnicals(data.technicals);
            setInvestorScores(data.investorScores);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol, range, interval]);

  const handleTimeframeChange = (newRange: string, newInterval: string) => {
    setRange(newRange);
    setInterval(newInterval);
  };

  const handleSelectStock = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveTab('terminal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Modern Clean Header (Groww aesthetic) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand Name */}
          <div
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-xs">
              <span className="font-black text-white text-base">α</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Stock Alpha</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                  NSE
                </span>
              </div>
            </div>
          </div>

          {/* Clean Top Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'explore'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-slate-100 text-emerald-700 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Recommendations
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('screener')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'screener'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Screener
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'terminal'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Charts &amp; Terminal
            </button>
          </nav>

          {/* Stock Quick Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedSymbol}
                onChange={(e) => {
                  setSelectedSymbol(e.target.value);
                  setActiveTab('terminal');
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
              >
                {STOCK_UNIVERSE.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol.replace('.NS', '')} - {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Live Market Ticker Tape */}
      <LiveTickerTape onSelectStock={handleSelectStock} />

      {/* Main Page Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* PAGE 1: Market Explore (Groww style) */}
        {activeTab === 'explore' && (
          <ExploreView onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 2: Dedicated Recommendations & Portfolio Rebalance */}
        {activeTab === 'recommendations' && (
          <RecommendationsView onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 3: Portfolio View */}
        {activeTab === 'portfolio' && (
          <PortfolioView onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 4: Quantitative Screener */}
        {activeTab === 'screener' && (
          <KeyStockScanner onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 5: Terminal & In-depth Technicals */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            {/* Ticker Banner */}
            {quote && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-800">
                    {quote.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-slate-900">{quote.name}</h1>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                        {quote.symbol.replace('.NS', '')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {quote.sector}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono">
                      <span>P/E: <strong className="text-slate-800">{quote.peRatio}</strong></span>
                      <span>ROIC: <strong className="text-emerald-600">{quote.roic}%</strong></span>
                      <span>FCF Yield: <strong className="text-emerald-600">{quote.fcfYield}%</strong></span>
                      <span>Altman Z: <strong className="text-indigo-600">{quote.altmanZScore}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900 font-mono">
                    ₹{quote.price.toLocaleString('en-IN')}
                  </div>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${quote.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {quote.change >= 0 ? '+' : ''}{quote.change} ({quote.changePercent}%)
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Candlestick Chart */}
            {loading ? (
              <div className="h-[420px] rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 animate-pulse text-xs font-medium">
                Loading interactive financial chart...
              </div>
            ) : (
              <StockChart
                candles={candles}
                technicals={technicals || undefined}
                symbol={selectedSymbol}
                onTimeframeChange={handleTimeframeChange}
                activeInterval={interval}
              />
            )}

            {/* Moving Average & Formations */}
            {technicals && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                    <Activity className="w-4 h-4 text-emerald-600" /> Classical &amp; Harmonic Formations
                  </div>
                  {technicals.patternsDetected.length === 0 ? (
                    <p className="text-xs text-slate-400">Consolidating within normal trading ranges without active exhaustion signals.</p>
                  ) : (
                    <div className="space-y-2">
                      {technicals.patternsDetected.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            p.type === 'bullish' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.type}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{p.name} ({p.confidence}% Confidence)</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                    <Layers className="w-4 h-4 text-emerald-600" /> Moving Average Energy &amp; Squeeze
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">20 / 50 / 200 EMA Spread:</span>
                      <span className="font-mono font-bold text-slate-900">{technicals.maConvergence.spreadPercent}%</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {technicals.maConvergence.description}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 uppercase">Resistance Level</div>
                      <div className="font-bold text-rose-600 mt-0.5">₹{technicals.supportResistance.resistances[0] || '-'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 uppercase">Support Floor</div>
                      <div className="font-bold text-emerald-600 mt-0.5">₹{technicals.supportResistance.supports[0] || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5 Legendary Investor Synthesis Matrix */}
            {investorScores && (
              <InvestorDashboard scores={investorScores} />
            )}
          </div>
        )}
      </main>

      {/* Clean Subtle Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-slate-600">
          <span>Stock Alpha</span> &bull; <span>Indian Quantitative Intelligence</span>
        </div>
        <div className="text-[11px] text-slate-400">
          5-Gate Consensus: Buffett, Druckenmiller, Dalio, Burry, Wood &amp; Technical Analytics
        </div>
      </footer>
    </div>
  );
}
