'use client';

import React, { useState, useEffect } from 'react';
import AlphaSignalsView from '@/components/AlphaSignalsView';
import { StockQuote, TechnicalIndicators, InvestorScores } from '@/types/stock';
import {
  Play,
  CheckCircle2,
  Sliders,
  ArrowUpRight,
  Search,
  Filter,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Building2,
  Layers,
  Terminal,
  Bell,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

interface CustomQueryRule {
  id: string;
  field: 'price' | 'rsi' | 'ema20' | 'ema50' | 'ema200' | 'peRatio' | 'roic' | 'volume';
  operator: '>' | '<' | '>=' | '<=';
  compareWith: 'value' | 'field';
  targetValue: number;
  targetField?: 'price' | 'ema20' | 'ema50' | 'ema200';
}

interface ScanResult {
  quote: StockQuote;
  technicals: TechnicalIndicators;
  investorScores: InvestorScores;
}

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function MarketScanner({ onSelectStock }: Props) {
  // Mode: Alpha Signals, All Filters, Fundamental, Technical, or Custom Query Builder
  const [screenerMode, setScreenerMode] = useState<'alphaSignals' | 'all' | 'fundamental' | 'technical' | 'customQuery'>('alphaSignals');

  // Visual Custom Query Builder State
  const [customRules, setCustomRules] = useState<CustomQueryRule[]>([
    { id: '1', field: 'price', operator: '>', compareWith: 'field', targetValue: 0, targetField: 'ema50' },
    { id: '2', field: 'rsi', operator: '>', compareWith: 'value', targetValue: 55 }
  ]);

  // Alert System State
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; sector: string }>>([]);
  const [searching, setSearching] = useState(false);

  // Screener Filters
  const [universe, setUniverse] = useState('NSE_ALL');

  // Fundamental Filters
  const [investorFilter, setInvestorFilter] = useState('ALL');
  const [peRange, setPeRange] = useState('ALL');
  const [minRoic, setMinRoic] = useState('ALL');
  const [debtRatio, setDebtRatio] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');

  // Technical Filters
  const [maSetup, setMaSetup] = useState('ALL');
  const [rsiCondition, setRsiCondition] = useState('ALL');
  const [patternCondition, setPatternCondition] = useState('ALL');
  const [priceAboveEMA200, setPriceAboveEMA200] = useState(false);
  const [minScore, setMinScore] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Live Symbol Autocomplete Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const runScanner = async (specificSymbol?: string) => {
    setLoading(true);
    setSearchResults([]);
    try {
      const params = new URLSearchParams({
        universe,
        investorFilter,
        maSetup,
        rsiCondition,
        patternCondition,
        minScore: minScore.toString()
      });

      if (specificSymbol) {
        params.append('symbol', specificSymbol);
      }

      const res = await fetch(`/api/scan?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: ScanResult[] = data.results || [];

        // Apply fundamental client-side constraints
        if (peRange === 'LOW') list = list.filter(r => (r.quote.peRatio || 25) < 20);
        if (peRange === 'MID') list = list.filter(r => (r.quote.peRatio || 25) >= 20 && (r.quote.peRatio || 25) <= 35);
        if (minRoic === 'ROIC_15') list = list.filter(r => (r.quote.roic || 15) >= 15);
        if (minRoic === 'ROIC_25') list = list.filter(r => (r.quote.roic || 15) >= 25);
        if (debtRatio === 'LOW_DEBT') list = list.filter(r => (r.quote.debtToEquity || 0.5) < 0.3);
        if (sectorFilter !== 'ALL') list = list.filter(r => r.quote.sector === sectorFilter);

        // Apply technical client-side constraints
        if (priceAboveEMA200) list = list.filter(r => r.quote.price > r.technicals.ema200);

        // Apply Alpha Custom Query Rules (if active)
        if (screenerMode === 'customQuery' && customRules.length > 0) {
          list = list.filter(r => {
            return customRules.every(rule => {
              const getVal = (f: string) => {
                if (f === 'price') return r.quote.price;
                if (f === 'rsi') return r.technicals.rsi14;
                if (f === 'ema20') return r.technicals.ema20;
                if (f === 'ema50') return r.technicals.ema50;
                if (f === 'ema200') return r.technicals.ema200;
                if (f === 'peRatio') return r.quote.peRatio || 0;
                if (f === 'roic') return r.quote.roic || 0;
                if (f === 'volume') return r.quote.volume;
                return 0;
              };

              const leftVal = getVal(rule.field);
              const rightVal = rule.compareWith === 'field' && rule.targetField ? getVal(rule.targetField) : rule.targetValue;

              if (rule.operator === '>') return leftVal > rightVal;
              if (rule.operator === '<') return leftVal < rightVal;
              if (rule.operator === '>=') return leftVal >= rightVal;
              if (rule.operator === '<=') return leftVal <= rightVal;
              return true;
            });
          });
        }

        setResults(list);
        setHasScanned(true);

        if (alertEnabled && list.length > 0) {
          setActiveAlertCount(list.length);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Live Stock Search Bar with Autocomplete Dropdown */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="relative">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Direct Stock Search (Live NSE Scrip Lookup)
          </label>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by company name or NSE ticker (e.g., Tata Motors, INFY, Reliance, HDFC, SBI)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-28 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
            {searching && (
              <span className="text-xs font-semibold text-emerald-600 absolute right-4">
                Searching live...
              </span>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => {
                    setSearchQuery(item.name);
                    setSearchResults([]);
                    onSelectStock(item.symbol);
                  }}
                  className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.symbol.replace('.NS', '').replace('.BO', '')}
                    </span>
                    <span className="font-semibold text-sm text-slate-900">{item.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{item.sector}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Alerts Trigger Notification Banner */}
      {alertEnabled && activeAlertCount > 0 && (
        <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 rounded-xl">
              <Bell className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Real-Time Technical Alert Triggered!</div>
              <div className="text-xs text-amber-100">
                {activeAlertCount} stock{activeAlertCount > 1 ? 's' : ''} matched your active query conditions during this scan.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveAlertCount(0)}
            className="text-xs font-semibold px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Main Screener Engine with Fundamental & Technical Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {/* Header & Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between pb-5 border-b border-slate-100 gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Dual-Analysis Screener</h2>
              <p className="text-xs text-slate-500">Screen securities using Fundamental valuation ratios and Technical chart setups</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Mode Control */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setScreenerMode('alphaSignals')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  screenerMode === 'alphaSignals' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Alpha Signals
              </button>
              <button
                onClick={() => setScreenerMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  screenerMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Filters
              </button>
              <button
                onClick={() => setScreenerMode('fundamental')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  screenerMode === 'fundamental' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Fundamental
              </button>
              <button
                onClick={() => setScreenerMode('technical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  screenerMode === 'technical' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Technical Charts
              </button>
              <button
                onClick={() => setScreenerMode('customQuery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  screenerMode === 'customQuery' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Custom Query Builder
              </button>
            </div>

            {/* Live Alert Trigger Toggle */}
            <button
              onClick={() => {
                setAlertEnabled(!alertEnabled);
                if (!alertEnabled) {
                  // Request Notification permission if supported
                  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                alertEnabled
                  ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
              }`}
              title="Trigger notifications when scan criteria are met"
            >
              <Bell className={`w-3.5 h-3.5 ${alertEnabled ? 'fill-amber-500 text-amber-600' : ''}`} />
              {alertEnabled ? 'Alerts Active' : 'Enable Alerts'}
            </button>

            <button
              onClick={() => runScanner()}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'fill-white'}`} />
              {loading ? 'Scanning Universe...' : 'Run Screener'}
            </button>
          </div>
        </div>

        {/* Custom Query Builder Panel (Alpha Feature) */}
        {screenerMode === 'customQuery' && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mb-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" /> Visual Query &amp; Condition Builder
                </h3>
                <p className="text-xs text-indigo-700/80">
                  Combine any price action, momentum, or valuation rules without coding (e.g. Close &gt; EMA 50 AND RSI &gt; 55)
                </p>
              </div>
              <button
                onClick={() =>
                  setCustomRules(prev => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      field: 'rsi',
                      operator: '>',
                      compareWith: 'value',
                      targetValue: 50
                    }
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </button>
            </div>

            <div className="space-y-2.5">
              {customRules.map((rule, idx) => (
                <div key={rule.id} className="flex flex-wrap items-center gap-2.5 bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                  <span className="text-[11px] font-bold text-indigo-600 px-2 py-0.5 rounded bg-indigo-50">
                    {idx === 0 ? 'IF' : 'AND'}
                  </span>

                  {/* Left Field */}
                  <select
                    value={rule.field}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setCustomRules(rules => rules.map(r => r.id === rule.id ? { ...r, field: v } : r));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none"
                  >
                    <option value="price">Current Price (LTP)</option>
                    <option value="rsi">RSI 14</option>
                    <option value="ema20">EMA 20</option>
                    <option value="ema50">EMA 50</option>
                    <option value="ema200">EMA 200</option>
                    <option value="peRatio">P/E Ratio</option>
                    <option value="roic">ROIC %</option>
                    <option value="volume">Day Volume</option>
                  </select>

                  {/* Operator */}
                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setCustomRules(rules => rules.map(r => r.id === rule.id ? { ...r, operator: v } : r));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none"
                  >
                    <option value=">">&gt; Greater Than</option>
                    <option value="<">&lt; Less Than</option>
                    <option value=">=">&gt;= Greater or Equal</option>
                    <option value="<=">&lt;= Less or Equal</option>
                  </select>

                  {/* Compare mode */}
                  <select
                    value={rule.compareWith}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setCustomRules(rules => rules.map(r => r.id === rule.id ? { ...r, compareWith: v } : r));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none"
                  >
                    <option value="value">Fixed Value</option>
                    <option value="field">Another Indicator</option>
                  </select>

                  {/* Right Target */}
                  {rule.compareWith === 'value' ? (
                    <input
                      type="number"
                      value={rule.targetValue}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCustomRules(rules => rules.map(r => r.id === rule.id ? { ...r, targetValue: v } : r));
                      }}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-semibold outline-none"
                    />
                  ) : (
                    <select
                      value={rule.targetField || 'ema50'}
                      onChange={(e) => {
                        const v = e.target.value as any;
                        setCustomRules(rules => rules.map(r => r.id === rule.id ? { ...r, targetField: v } : r));
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none"
                    >
                      <option value="price">Price</option>
                      <option value="ema20">EMA 20</option>
                      <option value="ema50">EMA 50</option>
                      <option value="ema200">EMA 200</option>
                    </select>
                  )}

                  <button
                    onClick={() => setCustomRules(rules => rules.filter(r => r.id !== rule.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-auto"
                    title="Remove Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alpha High-Probability Signals View Mode */}
        {screenerMode === 'alphaSignals' && (
          <div className="mb-6">
            <AlphaSignalsView onSelectStock={onSelectStock} />
          </div>
        )}

        {/* Dynamic Filters Form */}
        {screenerMode !== 'alphaSignals' && (
        <div className="space-y-5">
          {/* Section A: Fundamental Parameters */}
          {(screenerMode === 'all' || screenerMode === 'fundamental') && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2.5">
                <ShieldCheck className="w-4 h-4" /> Fundamental &amp; Valuation Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-medium">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Investor Model</label>
                  <select
                    value={investorFilter}
                    onChange={(e) => setInvestorFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Any Model</option>
                    <option value="BUFFETT">Warren Buffett Quality Moat (&ge;70)</option>
                    <option value="BURRY">Michael Burry Deep Margin of Safety</option>
                    <option value="DALIO">Ray Dalio All-Weather Debt Resilience</option>
                    <option value="WOOD">Cathie Wood Innovation</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">P/E Valuation Ratio</label>
                  <select
                    value={peRange}
                    onChange={(e) => setPeRange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Valuations</option>
                    <option value="LOW">Low P/E (&lt; 20x) - Value Zone</option>
                    <option value="MID">Fair Multiple (20x - 35x)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Capital Efficiency (ROIC)</label>
                  <select
                    value={minRoic}
                    onChange={(e) => setMinRoic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Any ROIC</option>
                    <option value="ROIC_15">&ge; 15% (Buffett Moat Standard)</option>
                    <option value="ROIC_25">&ge; 25% (Elite Capital Compounder)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Balance Sheet Leverage</label>
                  <select
                    value={debtRatio}
                    onChange={(e) => setDebtRatio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Any Debt Level</option>
                    <option value="LOW_DEBT">Ultra-Low Leverage (D/E &lt; 0.3)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section B: Technical Parameters */}
          {(screenerMode === 'all' || screenerMode === 'technical') && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2.5">
                <BarChart2 className="w-4 h-4" /> Technical Chart Setups
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-medium">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Moving Average Squeeze</label>
                  <select
                    value={maSetup}
                    onChange={(e) => setMaSetup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All States</option>
                    <option value="MA_CONVERGENCE">⚡ Coiled Convergence (&le;3.2%)</option>
                    <option value="GOLDEN_CROSS">Golden Cross (50 &gt; 200 EMA)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">RSI 14 Momentum</label>
                  <select
                    value={rsiCondition}
                    onChange={(e) => setRsiCondition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Any RSI</option>
                    <option value="BULLISH_MOMENTUM">Momentum Sweetspot (50 - 68)</option>
                    <option value="OVERSOLD">Deep Oversold (&lt; 35)</option>
                    <option value="OVERBOUGHT">Overbought Parabolic (&gt; 70)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Chart Formations</label>
                  <select
                    value={patternCondition}
                    onChange={(e) => setPatternCondition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Any Pattern</option>
                    <option value="BREAKOUT">60-Day Resistance Breakout</option>
                    <option value="DOUBLE_BOTTOM">Double Bottom (W-Shape)</option>
                    <option value="TRIPLE_BOTTOM">Triple Bottom Reversal</option>
                    <option value="TRIPLE_TOP">Triple Top Resistance</option>
                    <option value="KEY_ZONE">Key Support Zone Test</option>
                    <option value="HARMONIC_ABCD">Harmonic ABCD Wave</option>
                    <option value="WOLFE_WAVE">Wolfe Wave Wedge (Point 5)</option>
                    <option value="FIB_BOUNCE">Fibonacci 61.8% Golden Bounce</option>
                    <option value="CANDLE_BULLISH">Bullish Candle (Hammer / Engulfing / Morning Star)</option>
                    <option value="GAP_UP">↗ Bullish Gap Up</option>
                    <option value="GAP_DOWN">↘ Bearish Gap Down</option>
                    <option value="PIVOT_BREAKOUT">⚡ Classic Pivot R1 Breakout</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Trend Regime</label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="ema200Check"
                      checked={priceAboveEMA200}
                      onChange={(e) => setPriceAboveEMA200(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="ema200Check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Price &gt; 200 EMA (Institutional Bull)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* 3. Screened Results Table */}
      {hasScanned && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Found <strong className="text-slate-900">{results.length}</strong> matching Indian securities
            </div>
            <span className="text-[11px] text-slate-400">Real-time live market feed actuals</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No securities met the combined fundamental and technical conditions. Try easing criteria or selecting &apos;All Filters&apos;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Security</th>
                    <th className="px-4 py-3">Live Price</th>
                    <th className="px-4 py-3">Fundamental Metrics</th>
                    <th className="px-4 py-3">Technical Setups</th>
                    <th className="px-4 py-3">5-Gate Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {results.map(({ quote, technicals, investorScores }) => {
                    const isPositive = quote.change >= 0;
                    return (
                      <tr key={quote.symbol} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{quote.name}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {quote.symbol.replace('.NS', '')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{quote.sector} &bull; NSE</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-900">
                            ₹{quote.price.toLocaleString('en-IN')}
                          </div>
                          <div className={`text-[11px] font-mono font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? '+' : ''}{quote.changePercent}%
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px]">
                          <div>P/E: <strong className="text-slate-900">{quote.peRatio}x</strong></div>
                          <div className="text-emerald-700">ROIC: <strong>{quote.roic}%</strong></div>
                          <div className="text-slate-400">D/E: {quote.debtToEquity}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {technicals.maConvergence.isConverging && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                Coiled ({technicals.maConvergence.spreadPercent}%)
                              </span>
                            )}
                            {technicals.patternsDetected.map((p, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                {p.name}
                              </span>
                            ))}
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                              RSI: {technicals.rsi14}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">{investorScores.compositeScore}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              investorScores.unifiedDecision === 'STRONG BUY'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : investorScores.unifiedDecision === 'ACCUMULATE'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {investorScores.unifiedDecision}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => onSelectStock(quote.symbol)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                          >
                            Analyze <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
