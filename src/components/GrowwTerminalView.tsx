'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StockQuote, Candle, TechnicalIndicators, InvestorScores } from '@/types/stock';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import StockChart from '@/components/StockChart';
import InvestorDashboard from '@/components/InvestorDashboard';
import GrowwPeersComparison from '@/components/GrowwPeersComparison';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Clock,
  Zap,
  Info
} from 'lucide-react';

interface Props {
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  quote: StockQuote | null;
  candles: Candle[];
  technicals: TechnicalIndicators | null;
  investorScores: InvestorScores | null;
  loading: boolean;
  chartInterval: string;
  onTimeframeChange: (range: string, interval: string) => void;
  replayIdx: number;
  isReplaying: boolean;
  onToggleReplay: () => void;
  onStepNextReplay: () => void;
  onResetReplay: () => void;
  lastLiveTickTime: string;
}

export default function GrowwTerminalView({
  selectedSymbol,
  onSelectStock,
  quote,
  candles,
  technicals,
  investorScores,
  loading,
  chartInterval,
  onTimeframeChange,
  replayIdx,
  isReplaying,
  onToggleReplay,
  onStepNextReplay,
  onResetReplay,
  lastLiveTickTime
}: Props) {
  // In-terminal stock search state
  const [terminalSearch, setTerminalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const activeCandles = replayIdx >= 0 ? candles.slice(0, replayIdx + 1) : candles;

  // 52-Week Range metrics (Groww style)
  const currentPrice = quote?.price || 1000;
  const high52 = quote?.fiftyTwoWeekHigh || currentPrice * 1.25;
  const low52 = quote?.fiftyTwoWeekLow || currentPrice * 0.75;
  const dayHigh = quote?.dayHigh || quote?.high || currentPrice * 1.02;
  const dayLow = quote?.dayLow || quote?.low || currentPrice * 0.98;

  // Percentage on 52W range for slider thumb position
  const range52Percent = Math.min(
    100,
    Math.max(0, ((currentPrice - low52) / (high52 - low52 || 1)) * 100)
  );

  const rangeDayPercent = Math.min(
    100,
    Math.max(0, ((currentPrice - dayLow) / (dayHigh - dayLow || 1)) * 100)
  );

  const filteredSearch = STOCK_UNIVERSE.filter(
    (s) =>
      s.symbol.toLowerCase().includes(terminalSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(terminalSearch.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPositive = (quote?.changePercent || 0) >= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in">
      {/* 1. Terminal Top Bar: Dedicated Stock Search + Live Stock Quote Header (Groww Style) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Dedicated Terminal Stock Search */}
          <div ref={searchRef} className="relative flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Switch stock in Terminal (e.g. Tata Motors, Infosys, HDFC)..."
                value={terminalSearch}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setTerminalSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredSearch.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => {
                      onSelectStock(s.symbol);
                      setIsSearchOpen(false);
                      setTerminalSearch('');
                    }}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {s.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-[11px] text-slate-400">{s.name}</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {s.sector}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-Time Live Clock Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>NSE Live Feed: {lastLiveTickTime}</span>
          </div>
        </div>

        {/* Stock Title, Price & 52-Week Range Slider (Classic Groww Feature) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {quote?.name || selectedSymbol.replace('.NS', '')}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold uppercase">
                {quote?.exchange || 'NSE'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {quote?.sector || 'Large Cap'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
                ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-1 text-sm font-bold font-mono px-2.5 py-0.5 rounded-lg ${
                  isPositive
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-rose-700 bg-rose-50 border border-rose-200'
                }`}
              >
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}
                {quote?.change ? quote.change.toFixed(2) : '0.00'} (
                {isPositive ? '+' : ''}
                {quote?.changePercent ? quote.changePercent.toFixed(2) : '0.00'}%)
              </span>
            </div>
          </div>

          {/* Groww Range Sliders: Day High/Low & 52W High/Low */}
          <div className="w-full lg:w-96 space-y-3 bg-slate-50/90 p-4 rounded-2xl border border-slate-100 text-xs">
            {/* Today's Low / High */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                <span>Today's Low: <strong>₹{dayLow.toFixed(1)}</strong></span>
                <span>Today's High: <strong>₹{dayHigh.toFixed(1)}</strong></span>
              </div>
              <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full"
                  style={{ width: `${rangeDayPercent}%` }}
                />
              </div>
            </div>

            {/* 52-Week Low / High */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                <span>52W Low: <strong>₹{low52.toFixed(1)}</strong></span>
                <span>52W High: <strong>₹{high52.toFixed(1)}</strong></span>
              </div>
              <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full"
                  style={{ width: `${range52Percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Candlestick Chart Area + Bar Replay Engine */}
      <div className="space-y-4">
        {/* Bar Replay Simulator Controls */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-indigo-600" /> Bar Replay Simulator:
            </span>
            <span className="text-slate-500 text-[11px]">
              {replayIdx >= 0 ? `Showing bar ${replayIdx + 1} of ${candles.length}` : 'Live Market Feed'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleReplay}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isReplaying
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              <Play className="w-3 h-3" />
              {isReplaying ? 'Pause Replay' : 'Play Bar Replay'}
            </button>
            <button
              onClick={onStepNextReplay}
              disabled={replayIdx < 0 || replayIdx >= candles.length - 1}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40 cursor-pointer"
            >
              Step Next →
            </button>
            <button
              onClick={onResetReplay}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Live
            </button>
          </div>
        </div>

        {/* Candlestick Chart with Indicator Overlays */}
        {loading ? (
          <div className="h-[440px] rounded-3xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 animate-pulse text-xs font-medium">
            Loading interactive financial chart...
          </div>
        ) : (
          <StockChart
            candles={activeCandles}
            technicals={technicals || undefined}
            symbol={selectedSymbol}
            onTimeframeChange={onTimeframeChange}
            activeInterval={chartInterval}
          />
        )}
      </div>

      {/* 3. Groww Peer Comparison Table */}
      <GrowwPeersComparison
        currentSymbol={selectedSymbol}
        onSelectStock={onSelectStock}
      />

      {/* 4. 5-Gate Legendary Investor Scoring Model */}
      {investorScores && (
        <InvestorDashboard scores={investorScores} />
      )}

      {/* 5. Classical Formations & Moving Average Squeeze */}
      {technicals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
              <Activity className="w-4 h-4 text-emerald-600" /> Classical Formations
            </div>
            {technicals.patternsDetected.length === 0 ? (
              <p className="text-xs text-slate-400">Consolidating within normal trading ranges without active exhaustion signals.</p>
            ) : (
              <div className="space-y-2">
                {technicals.patternsDetected.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
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

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
              <Layers className="w-4 h-4 text-emerald-600" /> Moving Average Energy &amp; Squeeze
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">20 / 50 / 200 EMA Spread:</span>
                <span className="font-mono font-bold text-slate-900">{technicals.maConvergence.spreadPercent}%</span>
              </div>
              <div className="text-[11px] text-slate-600">
                {technicals.maConvergence.description}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Resistance Level</div>
                <div className="font-bold text-rose-600 mt-0.5">₹{technicals.supportResistance.resistances[0] || '-'}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Support Level</div>
                <div className="font-bold text-emerald-600 mt-0.5">₹{technicals.supportResistance.supports[0] || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
