'use client';

import React, { useState, useEffect, useRef } from 'react';
import StockChart from '@/components/StockChart';
import InvestorDashboard from '@/components/InvestorDashboard';
import KeyStockScanner from '@/components/KeyStockScanner';
import PortfolioView from '@/components/PortfolioView';
import ExploreView from '@/components/ExploreView';
import RecommendationsView from '@/components/RecommendationsView';
import MarketMoversAllView from '@/components/MarketMoversAllView';
import GoogleSignInModal, { UserProfile } from '@/components/GoogleSignInModal';
import LiveTickerTape from '@/components/LiveTickerTape';
import { StockQuote, Candle, TechnicalIndicators, InvestorScores } from '@/types/stock';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import {
  Compass,
  Sparkles,
  Wallet,
  LineChart,
  Sliders,
  Search,
  Activity,
  Layers,
  BookOpen,
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE.NS');
  const [activeTab, setActiveTab] = useState<'explore' | 'recommendations' | 'portfolio' | 'screener' | 'terminal' | 'market-movers-all'>('explore');
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<string>('1y');
  const [chartInterval, setChartInterval] = useState<string>('1d');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [investorScores, setInvestorScores] = useState<InvestorScores | null>(null);

  // User Profile & Google Cloud Authentication
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Search input in header (Groww style clean search bar)
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerSearchResults, setHeaderSearchResults] = useState<Array<{ symbol: string; name: string; sector: string }>>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Bar Replay state for KeyStocks backtester
  const [replayIdx, setReplayIdx] = useState<number>(-1);
  const [isReplaying, setIsReplaying] = useState(false);

  // Load saved Google Cloud profile from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('stock_alpha_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSignIn = (profile: UserProfile) => {
    setUser(profile);
    try {
      localStorage.setItem('stock_alpha_user', JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const handleSignOut = () => {
    setUser(null);
    try {
      localStorage.removeItem('stock_alpha_user');
    } catch {
      // ignore
    }
    setIsSignInModalOpen(false);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search handler
  useEffect(() => {
    if (!headerSearchQuery.trim()) {
      setHeaderSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(headerSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setHeaderSearchResults(data.results || []);
        }
      } catch {
        // fallback to universe match
        const local = STOCK_UNIVERSE.filter(s =>
          s.symbol.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(headerSearchQuery.toLowerCase())
        );
        setHeaderSearchResults(local);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [headerSearchQuery]);

  // Fetch full data for selected symbol with automatic background 5-second real-time polling
  useEffect(() => {
    let isCancelled = false;
    async function loadData(silent: boolean = false) {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/stock?symbol=${encodeURIComponent(selectedSymbol)}&range=${range}&interval=${chartInterval}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setQuote(data.quote);
            setCandles(data.candles);
            setTechnicals(data.technicals);
            setInvestorScores(data.investorScores);
            if (!silent) {
              setReplayIdx(-1);
              setIsReplaying(false);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled && !silent) setLoading(false);
      }
    }

    loadData(false);

    // Live continuous ticker refresh every 5 seconds without freezing chart UI
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [selectedSymbol, range, chartInterval]);

  // Bar Replay simulator timer
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | undefined;
    if (isReplaying && replayIdx < candles.length - 1) {
      timerId = setInterval(() => {
        setReplayIdx((prev: number) => {
          if (prev >= candles.length - 1) {
            setIsReplaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isReplaying, replayIdx, candles.length]);

  const handleTimeframeChange = (newRange: string, newInterval: string) => {
    setRange(newRange);
    setChartInterval(newInterval);
  };

  const handleSelectStock = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveTab('terminal');
    setIsSearchOpen(false);
    setHeaderSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCandles = replayIdx >= 0 ? candles.slice(0, replayIdx + 1) : candles;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Modern Clean Header (De-cluttered Groww aesthetic - NO top-right select dropdown) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
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
                  NSE/BSE
                </span>
              </div>
            </div>
          </div>

          {/* Integrated Search Bar (Clean pill design, replaces bulky dropdown) */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Indian stocks (e.g. Reliance, TCS, HDFC)..."
                value={headerSearchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setHeaderSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-emerald-500 rounded-full pl-9 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Live Autocomplete Dropdown */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {headerSearchResults.length > 0 ? (
                  headerSearchResults.map((stock) => (
                    <div
                      key={stock.symbol}
                      onClick={() => handleSelectStock(stock.symbol)}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {stock.symbol.replace('.NS', '').replace('.BO', '')}
                        </div>
                        <div className="text-[11px] text-slate-400">{stock.name}</div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {stock.sector}
                      </span>
                    </div>
                  ))
                ) : headerSearchQuery ? (
                  <div className="p-4 text-center text-xs text-slate-400">No matching stocks found</div>
                ) : (
                  <div className="p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                      Popular Indian Scrips
                    </div>
                    {STOCK_UNIVERSE.slice(0, 5).map(s => (
                      <div
                        key={s.symbol}
                        onClick={() => handleSelectStock(s.symbol)}
                        className="px-3 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-700"
                      >
                        <span>{s.symbol.replace('.NS', '')}</span>
                        <span className="text-[10px] text-slate-400">{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clean Top Navigation Links */}
          <nav className="flex items-center gap-1 text-xs font-semibold text-slate-600 shrink-0">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'explore'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-slate-100 text-emerald-700 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Recommendations
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('screener')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'screener'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Screener
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'terminal'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Terminal
            </button>
          </nav>

          {/* Google Cloud Sign-In Button */}
          <div className="flex items-center gap-2 shrink-0">
            {user?.isSignedIn ? (
              <button
                onClick={() => setIsSignInModalOpen(true)}
                className="flex items-center gap-2 p-1 pl-2.5 pr-3 rounded-full border border-slate-200 hover:border-emerald-500 bg-white hover:bg-slate-50 transition-all text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-800">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-slate-800 max-w-[100px] truncate hidden md:inline">{user.name}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSignInModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live Market Ticker Tape */}
      <LiveTickerTape onSelectStock={handleSelectStock} />

      {/* Main Page Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* PAGE 1: Market Explore (Groww style) */}
        {activeTab === 'explore' && (
          <ExploreView
            onSelectStock={handleSelectStock}
            onViewAllMovers={() => setActiveTab('market-movers-all')}
          />
        )}

        {/* Dedicated Full Page Market Movers */}
        {activeTab === 'market-movers-all' && (
          <MarketMoversAllView
            onSelectStock={handleSelectStock}
            onBackToExplore={() => setActiveTab('explore')}
          />
        )}

        {/* PAGE 2: Dedicated Recommendations & Portfolio Rebalance */}
        {activeTab === 'recommendations' && (
          <RecommendationsView onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 3: Portfolio View (Order history consolidation & holdings import) */}
        {activeTab === 'portfolio' && (
          <PortfolioView onSelectStock={handleSelectStock} />
        )}

        {/* PAGE 4: Quantitative & KeyStocks Screener */}
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

            {/* KeyStocks Bar Replay Simulator Control Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo-600" /> Bar Replay Simulator:
                </span>
                <span className="text-slate-500">
                  {replayIdx >= 0 ? `Step ${replayIdx + 1} of ${candles.length} candles` : 'Live Chart Feed'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (replayIdx < 0) {
                      setReplayIdx(Math.max(10, candles.length - 20));
                    }
                    setIsReplaying(!isReplaying);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    isReplaying
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  {isReplaying ? 'Pause Replay' : 'Play Bar Replay'}
                </button>
                <button
                  onClick={() => {
                    setReplayIdx(prev => Math.min(candles.length - 1, (prev < 0 ? candles.length - 1 : prev) + 1));
                  }}
                  disabled={replayIdx < 0 || replayIdx >= candles.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40"
                >
                  Step Next →
                </button>
                <button
                  onClick={() => {
                    setReplayIdx(-1);
                    setIsReplaying(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Live
                </button>
              </div>
            </div>

            {/* Interactive Candlestick Chart */}
            {loading ? (
              <div className="h-[420px] rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 animate-pulse text-xs font-medium">
                Loading interactive financial chart...
              </div>
            ) : (
              <StockChart
                candles={activeCandles}
                technicals={technicals || undefined}
                symbol={selectedSymbol}
                onTimeframeChange={handleTimeframeChange}
                activeInterval={chartInterval}
              />
            )}

            {/* 5-Gate Legendary Investor Scoring Model */}
            {investorScores && (
              <InvestorDashboard scores={investorScores} />
            )}

            {/* Classical & Harmonic Formations and Moving Average Squeeze */}
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
                      <div className="text-[10px] text-slate-400 uppercase">Support Level</div>
                      <div className="font-bold text-emerald-600 mt-0.5">₹{technicals.supportResistance.supports[0] || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Google Cloud Sign-In Modal */}
      <GoogleSignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
