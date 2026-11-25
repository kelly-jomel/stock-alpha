'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockQuote, Candle, TechnicalIndicators } from '@/types/stock';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import StockChart from '@/components/StockChart';
import CloudSyncStatusBadge from '@/components/CloudSyncStatusBadge';
import { cloudSync } from '@/lib/cloudSync';
import {
  Search,
  Play,
  Layers,
  Crosshair,
  TrendingUp,
  Sliders,
  Filter,
  CheckCircle2,
  BookmarkPlus,
  RefreshCw,
  Clock,
  Sparkles,
  Maximize2,
  ChevronRight,
  Eye,
  BarChart2,
  Activity,
  Zap,
  Shield,
  Minus
} from 'lucide-react';

export interface KeyScanItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  category: 'KEYZONES' | 'CANDLESTICKS' | 'CHART_PATTERNS' | 'VOLUME_MOMENTUM';
  patternName: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  keyLevel: number;
  targetPrice: number;
  stopLoss: number;
  notes: string;
}

export default function KeyStocksTerminalView() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE.NS');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'KEYZONES' | 'CANDLESTICKS' | 'CHART_PATTERNS' | 'VOLUME_MOMENTUM'>('ALL');
  const [activeScanType, setActiveScanType] = useState<string>('KEYZONES');
  const [nBarsBack, setNBarsBack] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWatchlist, setSelectedWatchlist] = useState<'NIFTY_50' | 'TOP_100' | 'FUTURES' | 'MY_WATCHLIST'>('NIFTY_50');

  // Stock details state
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  // Watchlist from cloudSync
  const [myWatchlist, setMyWatchlist] = useState<string[]>([]);

  useEffect(() => {
    return cloudSync.subscribeData(data => {
      setMyWatchlist(data.watchlist || []);
    });
  }, []);

  // Fetch stock data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingStock(true);
      try {
        const res = await fetch(`/api/stock?symbol=${selectedSymbol}&range=1y&interval=1d`);
        if (res.ok && isMounted) {
          const json = await res.json();
          setQuote(json.quote);
          setCandles(json.candles || []);
          setTechnicals(json.technicals);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoadingStock(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [selectedSymbol]);

  // Scan database items (Replicating KeyStocks Screener Engine)
  const scanResults = useMemo<KeyScanItem[]>(() => {
    const list: KeyScanItem[] = [
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Ltd',
        price: 1373.90,
        changePercent: 0.8,
        category: 'KEYZONES',
        patternName: 'Demand KeyZone Retest',
        sentiment: 'BULLISH',
        confidence: 92,
        keyLevel: 1355.0,
        targetPrice: 1440.0,
        stopLoss: 1335.0,
        notes: 'Price respected major institutional accumulation KeyZone; strong buyer presence.'
      },
      {
        symbol: 'TATAMOTORS.NS',
        name: 'Tata Motors Ltd',
        price: 785.40,
        changePercent: 3.2,
        category: 'CHART_PATTERNS',
        patternName: 'Triple Bottom Foundation',
        sentiment: 'BULLISH',
        confidence: 94,
        keyLevel: 755.0,
        targetPrice: 865.0,
        stopLoss: 742.0,
        notes: 'Three verified swing rejections near ₹755 floor. Volume expansion on breakout.'
      },
      {
        symbol: 'INFY.NS',
        name: 'Infosys Ltd',
        price: 1845.20,
        changePercent: 2.1,
        category: 'VOLUME_MOMENTUM',
        patternName: '30-Day Volume Shocker (3.6x)',
        sentiment: 'BULLISH',
        confidence: 88,
        keyLevel: 1810.0,
        targetPrice: 1960.0,
        stopLoss: 1780.0,
        notes: 'Volume 3.6x above 30-day average turnover with gap-up continuation.'
      },
      {
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services',
        price: 4120.00,
        changePercent: -0.4,
        category: 'CANDLESTICKS',
        patternName: 'Bullish Hammer Pinbar',
        sentiment: 'BULLISH',
        confidence: 85,
        keyLevel: 4080.0,
        targetPrice: 4280.0,
        stopLoss: 4050.0,
        notes: 'Long lower shadow rejection candle at 50-day moving average.'
      },
      {
        symbol: 'HDFCBANK.NS',
        name: 'HDFC Bank Ltd',
        price: 1742.50,
        changePercent: 1.4,
        category: 'KEYZONES',
        patternName: 'Horizontal Resistance Breakout',
        sentiment: 'BULLISH',
        confidence: 90,
        keyLevel: 1720.0,
        targetPrice: 1820.0,
        stopLoss: 1705.0,
        notes: 'Clean daily close above 60-day horizontal distribution ceiling.'
      },
      {
        symbol: 'ICICIBANK.NS',
        name: 'ICICI Bank Ltd',
        price: 1265.80,
        changePercent: 1.8,
        category: 'CANDLESTICKS',
        patternName: 'Morning Star Formation',
        sentiment: 'BULLISH',
        confidence: 91,
        keyLevel: 1240.0,
        targetPrice: 1330.0,
        stopLoss: 1225.0,
        notes: 'Confirmed 3-bar reversal sequence following brief consolidation.'
      },
      {
        symbol: 'BAJFINANCE.NS',
        name: 'Bajaj Finance Ltd',
        price: 7120.00,
        changePercent: -1.2,
        category: 'CHART_PATTERNS',
        patternName: 'Triple Top Ceiling Test',
        sentiment: 'BEARISH',
        confidence: 87,
        keyLevel: 7250.0,
        targetPrice: 6750.0,
        stopLoss: 7340.0,
        notes: 'Overhead supply cluster rejected prices for the third consecutive week.'
      },
      {
        symbol: 'LT.NS',
        name: 'Larsen & Toubro Ltd',
        price: 3640.00,
        changePercent: 2.4,
        category: 'KEYZONES',
        patternName: 'Floating Trendline Support Bounce',
        sentiment: 'BULLISH',
        confidence: 86,
        keyLevel: 3580.0,
        targetPrice: 3820.0,
        stopLoss: 3540.0,
        notes: 'Touch & bounce on primary multi-month upward floating channel.'
      }
    ];

    if (activeCategory === 'ALL') return list;
    return list.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  const handleSelectScrip = (sym: string) => {
    setSelectedSymbol(sym);
  };

  const handleSaveAsWatchlist = () => {
    scanResults.forEach(r => {
      cloudSync.toggleWatchlist(r.symbol);
    });
    alert(`Saved ${scanResults.length} scanned symbols to your Watchlist (synced to cloud)!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. Terminal Top Ribbon (Workstation Style) */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-sm">
              K
            </div>
            <div className="leading-none">
              <span className="font-extrabold text-sm text-amber-400 tracking-wider">TECHNICAL TERMINAL</span>
              <span className="text-[10px] text-slate-400 block font-mono">Pattern Scanner &amp; Workstation</span>
            </div>
          </div>
          
          <div className="h-4 w-px bg-slate-700 hidden sm:block mx-1" />

          {/* Scrip Quick Selector */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Load Scrip (e.g. RELIANCE, TCS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const query = searchQuery.trim().toUpperCase();
                  const target = query.endsWith('.NS') ? query : `${query}.NS`;
                  setSelectedSymbol(target);
                  setSearchQuery('');
                }
              }}
              className="bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none w-48 sm:w-60 font-mono transition-all"
            />
          </div>
        </div>

        {/* Center: Live Quote & 52W Info */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{selectedSymbol.replace('.NS', '')}</span>
            <span className="text-amber-400 font-bold text-sm">₹{quote?.price.toFixed(2) || '---'}</span>
            <span className={`text-[11px] font-bold ${((quote?.changePercent || 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
              {((quote?.changePercent || 0) >= 0 ? '+' : '')}{quote?.changePercent.toFixed(2)}%
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-400 text-[11px] flex items-center gap-3">
            <span>H: ₹{quote?.dayHigh || quote?.high || '---'}</span>
            <span>L: ₹{quote?.dayLow || quote?.low || '---'}</span>
            <span>Vol: {quote?.volume ? (quote.volume / 100000).toFixed(1) + 'L' : '---'}</span>
          </div>
        </div>

        {/* Right Status & Cloud Sync */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-[11px] font-mono text-emerald-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>NSE Live</span>
          </div>
          <CloudSyncStatusBadge />
        </div>
      </header>

      {/* 2. Main Workstation Area: 3-Column Split */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        
        {/* Left Panel: Scanner Suites & Market Watch */}
        <aside className="w-full xl:w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          
          {/* Scanner Category Switcher */}
          <div className="p-3 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Scanning Suites
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {scanResults.length} Matches
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setActiveCategory('KEYZONES')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  activeCategory === 'KEYZONES'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                🎯 KeyZones &amp; S/R
              </button>
              <button
                onClick={() => setActiveCategory('CANDLESTICKS')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  activeCategory === 'CANDLESTICKS'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                🕯️ Candlesticks
              </button>
              <button
                onClick={() => setActiveCategory('CHART_PATTERNS')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  activeCategory === 'CHART_PATTERNS'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                📐 Triple Top/Bottom
              </button>
              <button
                onClick={() => setActiveCategory('VOLUME_MOMENTUM')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  activeCategory === 'VOLUME_MOMENTUM'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                ⚡ Volume Shocker
              </button>
            </div>
          </div>

          {/* Scanner Controls Ribbon (N Bars Back & Run) */}
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">N-Bars Back:</span>
              <input
                type="number"
                min="0"
                max="30"
                value={nBarsBack}
                onChange={(e) => setNBarsBack(Number(e.target.value))}
                className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-amber-400 outline-none"
              />
            </div>

            <button
              onClick={handleSaveAsWatchlist}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-400 border border-slate-700 transition-colors"
              title="Save all matches to Watchlist (Press S)"
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>Save (S)</span>
            </button>
          </div>

          {/* Real-Time Scanned Results List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {scanResults.map((item) => (
              <div
                key={item.symbol}
                onClick={() => handleSelectScrip(item.symbol)}
                className={`p-3 cursor-pointer transition-all hover:bg-slate-800/60 ${
                  selectedSymbol === item.symbol
                    ? 'bg-amber-500/10 border-l-4 border-amber-500'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs font-mono text-white">
                    {item.symbol.replace('.NS', '')}
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                    item.sentiment === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {item.confidence}% {item.sentiment}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-amber-300/90 mb-1">
                  {item.patternName}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>₹{item.price.toFixed(2)}</span>
                  <span>Key: ₹{item.keyLevel}</span>
                  <span className="text-emerald-400">Target: ₹{item.targetPrice}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Watchlist Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Active Watchlist: {selectedWatchlist.replace('_', ' ')}
            </div>
            <div className="flex flex-wrap gap-1">
              {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'ICICIBANK', 'BAJFINANCE', 'LT'].map(s => (
                <button
                  key={s}
                  onClick={() => handleSelectScrip(`${s}.NS`)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    selectedSymbol.replace('.NS', '') === s
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center / Right Area: Dedicated Professional Chart & Analysis Canvas */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-3 sm:p-5 space-y-4">
          
          {/* Chart Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                  {quote?.name || selectedSymbol.replace('.NS', '')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-mono font-bold">
                  NSE: {selectedSymbol.replace('.NS', '')}
                </span>
                {technicals?.maConvergence.isConverging && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    ⚡ MA Squeeze ({technicals.maConvergence.spreadPercent}%)
                  </span>
                )}
              </div>

              {/* Price & Sentiment Badge */}
              <div className="flex items-baseline gap-3 font-mono">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  ₹{quote?.price.toFixed(2) || '---'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  (quote?.changePercent || 0) >= 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {(quote?.changePercent || 0) >= 0 ? '+' : ''}{quote?.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* High Performance Interactive Chart Component */}
            <div className="mt-3">
              <StockChart
                candles={candles}
                technicals={technicals || undefined}
                symbol={selectedSymbol}
              />
            </div>
          </div>

          {/* Bottom Diagnostics: Technical KeyLevels & Detected Setup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Key Support & Resistance Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <Layers className="w-3.5 h-3.5" />
                Key Support &amp; Resistance
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">R2 Resistance:</span>
                  <span className="text-rose-400 font-bold">₹{technicals?.pivots?.classic.r2 || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">R1 Resistance:</span>
                  <span className="text-rose-400 font-bold">₹{technicals?.pivots?.classic.r1 || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Central Pivot:</span>
                  <span className="text-amber-400 font-bold">₹{technicals?.pivots?.classic.p || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">S1 Support:</span>
                  <span className="text-emerald-400 font-bold">₹{technicals?.pivots?.classic.s1 || '---'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">S2 Support:</span>
                  <span className="text-emerald-400 font-bold">₹{technicals?.pivots?.classic.s2 || '---'}</span>
                </div>
              </div>
            </div>

            {/* Moving Average Alignment */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5" />
                Moving Average Regimes
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">20 EMA (Short-Term):</span>
                  <span className="text-sky-400 font-bold">₹{technicals?.ema20 || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">50 EMA (Medium-Term):</span>
                  <span className="text-purple-400 font-bold">₹{technicals?.ema50 || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">200 EMA (Institutional):</span>
                  <span className="text-amber-400 font-bold">₹{technicals?.ema200 || '---'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Trend Status:</span>
                  <span className={`font-bold ${(quote?.price || 0) > (technicals?.ema200 || 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(quote?.price || 0) > (technicals?.ema200 || 0) ? 'Bullish (Above 200 EMA)' : 'Bearish (Below 200 EMA)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Oscillators & Volatility */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <Zap className="w-3.5 h-3.5" />
                Momentum &amp; Volume
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">RSI (14):</span>
                  <span className={`font-bold ${(technicals?.rsi14 || 50) > 70 ? 'text-rose-400' : (technicals?.rsi14 || 50) < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {technicals?.rsi14 || '---'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">MACD Value:</span>
                  <span className="text-slate-200 font-bold">{technicals?.macd?.macd.toFixed(2) || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">MACD Signal:</span>
                  <span className="text-slate-200 font-bold">{technicals?.macd?.signal.toFixed(2) || '---'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Gap Status:</span>
                  <span className="text-amber-400 font-bold">
                    {technicals?.gaps?.hasGap ? `${technicals.gaps.type} (${technicals.gaps.gapSizePercent}%)` : 'No Active Gaps'}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

    </div>
  );
}
