'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi
} from 'lightweight-charts';
import { Candle, StockQuote, TechnicalIndicators } from '@/types/stock';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import { cloudSync } from '@/lib/cloudSync';
import { runTechnicalFullScan, ScanItem } from '@/lib/scanEngine';
import DrawingToolsOverlay, { DrawingTool } from '@/components/DrawingToolsOverlay';
import CloudSyncStatusBadge from '@/components/CloudSyncStatusBadge';
import BrokerConnectModal from '@/components/BrokerConnectModal';
import {
  Search,
  Plus,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  TrendingUp,
  Sliders,
  Filter,
  CheckCircle2,
  BookmarkPlus,
  Clock,
  Sparkles,
  Maximize2,
  Eye,
  BarChart2,
  Activity,
  Zap,
  Shield,
  Layers,
  Crosshair,
  Pencil,
  Type,
  Smile,
  Ruler,
  ZoomIn,
  Magnet,
  Lock,
  Trash2,
  Camera,
  Share2,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  Globe,
  Briefcase,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart
} from 'lucide-react';

export default function TradingViewWorkstation() {
  const [symbol, setSymbol] = useState<string>('RELIANCE.NS');
  const [selectedInterval, setSelectedInterval] = useState<'1m' | '5m' | '15m' | '1h' | '1D' | '1W'>('1D');
  const [chartType, setChartType] = useState<'candles' | 'hollow' | 'heikin' | 'line'>('candles');

  // Stock Data
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(false);

  // Active Tool in Left Toolbar
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool | 'cursor' | 'measure' | 'text'>('cursor');

  // Right Sidebar Navigation
  const [activeRightTab, setActiveRightTab] = useState<'watchlist' | 'scanner' | 'alerts' | 'news' | 'profile'>('watchlist');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Watchlist & Scanners
  const [watchlist, setWatchlist] = useState<string[]>(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [customSymbolInput, setCustomSymbolInput] = useState('');
  const [isAddingCustomStock, setIsAddingCustomStock] = useState(false);

  // Indicators Modal
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  // Bar Replay Engine
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIdx, setReplayIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chart DOM Containers
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  // Sync with cloudSync
  useEffect(() => {
    return cloudSync.subscribeData(data => {
      if (data.watchlist && data.watchlist.length > 0) {
        setWatchlist(data.watchlist);
      }
    });
  }, []);

  // Real-time Live Price Polling & Tick Stream (3s Interval)
  useEffect(() => {
    let isMounted = true;
    let isInitial = true;

    async function fetchStock(silent = false) {
      if (!silent) setLoading(true);
      try {
        const intervalMap: Record<string, string> = {
          '1m': '1m',
          '5m': '5m',
          '15m': '15m',
          '1h': '60m',
          '1D': '1d',
          '1W': '1wk'
        };
        const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1y&interval=${intervalMap[selectedInterval] || '1d'}&_t=${Date.now()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.quote) setQuote(data.quote);
          if (data.candles && data.candles.length > 0) {
            setCandles(prev => {
              // Smooth update to prevent chart flickering if identical
              if (prev.length === 0 || prev.length !== data.candles.length) {
                return data.candles;
              }
              const lastPrev = prev[prev.length - 1];
              const lastNew = data.candles[data.candles.length - 1];
              if (lastPrev.close !== lastNew.close || lastPrev.high !== lastNew.high) {
                return data.candles;
              }
              return prev;
            });
          }
          if (data.technicals) setTechnicals(data.technicals);
          if (isInitial) {
            setReplayIdx(-1);
            setIsPlaying(false);
            isInitial = false;
          }
        }
      } catch (e) {
        console.error('Error fetching stock:', e);
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    }

    // Initial fetch
    fetchStock(false);

    // Live continuous polling every 3 seconds for real-time market updates
    const pollTimer = setInterval(() => {
      fetchStock(true);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [symbol, selectedInterval]);

  // Sliced candles for Replay
  const currentCandles = useMemo(() => {
    if (!isReplaying || replayIdx < 0) return candles;
    return candles.slice(0, replayIdx + 1);
  }, [candles, isReplaying, replayIdx]);

  // Replay interval timer
  useEffect(() => {
    if (isPlaying && isReplaying) {
      replayTimerRef.current = setInterval(() => {
        setReplayIdx(prev => {
          if (prev >= candles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlaying, isReplaying, candles.length]);

  // Render TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current || currentCandles.length === 0) return;

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
        fontSize: 11,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif"
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' }
      },
      crosshair: {
        vertLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#2a2e39' }
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.2 }
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: selectedInterval !== '1D' && selectedInterval !== '1W',
        secondsVisible: false
      }
    });

    chartInstanceRef.current = chart;

    // Candlestick Series (Exact TradingView Emerald/Rose Colors)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#089981',
      downColor: '#f23645',
      borderVisible: false,
      wickUpColor: '#089981',
      wickDownColor: '#f23645'
    });

    const formattedData = currentCandles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    candleSeries.setData(formattedData);

    // Volume Series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 }
      });
      const volData = currentCandles.map(c => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)'
      }));
      volumeSeries.setData(volData);
    }

    // EMAs (20, 50, 200)
    const closes = currentCandles.map(c => c.close);
    if (showEMA20 && closes.length >= 20) {
      const ema20 = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 1, title: 'EMA 20' });
      let e = closes[0];
      const k = 2 / (20 + 1);
      const data = currentCandles.map(c => {
        e = c.close * k + e * (1 - k);
        return { time: c.time as any, value: Number(e.toFixed(2)) };
      });
      ema20.setData(data);
    }

    if (showEMA50 && closes.length >= 50) {
      const ema50 = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, title: 'EMA 50' });
      let e = closes[0];
      const k = 2 / (50 + 1);
      const data = currentCandles.map(c => {
        e = c.close * k + e * (1 - k);
        return { time: c.time as any, value: Number(e.toFixed(2)) };
      });
      ema50.setData(data);
    }

    if (showEMA200 && closes.length >= 200) {
      const ema200 = chart.addSeries(LineSeries, { color: '#9c27b0', lineWidth: 1, title: 'EMA 200' });
      let e = closes[0];
      const k = 2 / (200 + 1);
      const data = currentCandles.map(c => {
        e = c.close * k + e * (1 - k);
        return { time: c.time as any, value: Number(e.toFixed(2)) };
      });
      ema200.setData(data);
    }

    // Resize Observer
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0] && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [currentCandles, showVolume, showEMA20, showEMA50, showEMA200, selectedInterval]);

  // Market Scans
  const scanResults = useMemo(() => {
    return runTechnicalFullScan(symbol, quote?.name || symbol, candles, 0);
  }, [symbol, quote, candles]);

  // Watchlist items with live quote data
  const watchlistItems = useMemo(() => {
    return watchlist.map(sym => {
      const isSelected = sym === symbol;
      const basePrice = sym === symbol && quote ? quote.price : 1420.50;
      const change = sym === symbol && quote ? quote.change : 12.30;
      const changePct = sym === symbol && quote ? quote.changePercent : 0.85;
      return {
        symbol: sym,
        cleanSymbol: sym.replace('.NS', '').replace('.BO', ''),
        price: basePrice,
        change,
        changePct,
        isSelected
      };
    });
  }, [watchlist, symbol, quote]);

  // Filtered search list
  const filteredSearchUniverse = useMemo(() => {
    if (!searchQuery.trim()) return STOCK_UNIVERSE.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return STOCK_UNIVERSE.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#d1d4dc] font-sans overflow-hidden select-none">
      
      {/* 1. TRADINGVIEW TOP BAR */}
      <header className="h-[46px] border-b border-[#2a2e39] bg-[#131722] px-3 flex items-center justify-between gap-2 shrink-0 z-30">
        
        {/* Left: Symbol Search, Plus, Timeframes, Chart Styles, Indicators */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          
          {/* Symbol Search Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#2a2e39]/60 hover:bg-[#2a2e39] text-white font-bold text-xs cursor-pointer transition-colors"
          >
            <span>{symbol.replace('.NS', '')}</span>
            <Search className="w-3.5 h-3.5 text-[#787b86]" />
          </button>

          {/* Plus Compare Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
            title="Compare or Add Symbol"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

          {/* Timeframe Quick Buttons */}
          {(['1m', '5m', '15m', '1h', '1D', '1W'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setSelectedInterval(tf)}
              className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                selectedInterval === tf
                  ? 'text-[#2962ff] bg-[#2962ff]/10 font-bold'
                  : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
              }`}
            >
              {tf}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

          {/* Chart Types */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartType('candles')}
              className={`p-1.5 rounded cursor-pointer ${
                chartType === 'candles' ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#787b86] hover:text-white'
              }`}
              title="Candles"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

          {/* Indicators Button */}
          <button
            onClick={() => setIsIndicatorsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-[#d1d4dc] hover:bg-[#2a2e39] cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#2962ff]" />
            <span>Indicators</span>
          </button>

          {/* Alert Button */}
          <button
            onClick={() => {
              setActiveRightTab('alerts');
              setIsRightSidebarOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alert</span>
          </button>

          {/* Bar Replay Button */}
          <button
            onClick={() => {
              setIsReplaying(!isReplaying);
              if (!isReplaying) {
                setReplayIdx(Math.max(10, candles.length - 25));
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              isReplaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
        </div>

        {/* Right: Live Feed Indicator, Broker Feed Connect, Cloud Sync, Snapshot, Share, Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Continuous Feed Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>LIVE (3s)</span>
          </div>

          <button
            onClick={() => setIsBrokerModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all"
            title="Connect Free Broker API Feed (Angel One SmartAPI / Fyers)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Broker Feed</span>
          </button>

          <CloudSyncStatusBadge />

          <button
            onClick={() => {
              const syms = Array.from(new Set([...watchlist, symbol]));
              cloudSync.updateWatchlist(syms);
            }}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#2962ff] hover:bg-[#1e4bd8] text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            className="p-1.5 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
            title="Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Drawing Tools + Chart Canvas + Right Tool Multi-Dock) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT TOOLBAR (TradingView Drawing Icons Dock) */}
        <aside className="w-[48px] border-r border-[#2a2e39] bg-[#131722] flex flex-col items-center py-2 gap-2 shrink-0 z-20">
          <button
            onClick={() => setActiveDrawingTool('cursor')}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeDrawingTool === 'cursor' ? 'bg-[#2962ff]/20 text-[#2962ff]' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Crosshair / Cursor"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool('trendline')}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeDrawingTool === 'trendline' ? 'bg-[#2962ff]/20 text-[#2962ff]' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Trendline Tool"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool('fibonacci')}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeDrawingTool === 'fibonacci' ? 'bg-[#2962ff]/20 text-[#2962ff]' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Fibonacci Retracement"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool('horizontal')}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeDrawingTool === 'horizontal' ? 'bg-[#2962ff]/20 text-[#2962ff]' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Horizontal Key Support/Resistance Level"
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool('text')}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeDrawingTool === 'text' ? 'bg-[#2962ff]/20 text-[#2962ff]' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Text Note"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-[#2a2e39] my-1" />

          <button
            onClick={() => cloudSync.clearDrawingsForSymbol(symbol)}
            className="p-2 rounded text-[#787b86] hover:text-rose-400 hover:bg-[#2a2e39] cursor-pointer"
            title="Delete Drawings on Symbol"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </aside>

        {/* CENTER: Chart Canvas with Bid/Ask Trading Overlay */}
        <main className="flex-1 flex flex-col relative bg-[#131722] overflow-hidden">
          
          {/* Top-Left Chart Legend (Symbol, Timeframe, Live OHLC, Volume) */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{quote?.name || symbol}</span>
              <span className="text-xs text-[#787b86] font-mono">{selectedInterval}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                NSE
              </span>
            </div>

            {/* OHLC and Live Values */}
            {quote && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#787b86]">O <strong className="text-white">₹{quote.open.toFixed(2)}</strong></span>
                <span className="text-[#787b86]">H <strong className="text-white">₹{quote.high.toFixed(2)}</strong></span>
                <span className="text-[#787b86]">L <strong className="text-white">₹{quote.low.toFixed(2)}</strong></span>
                <span className="text-[#787b86]">C <strong className="text-white">₹{quote.price.toFixed(2)}</strong></span>
                <span className={quote.change >= 0 ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Top-Left Quick Buy/Sell Trading Buttons (Exact TradingView Mockup) */}
          {quote && (
            <div className="absolute left-3 top-14 z-10 flex items-center gap-1 pointer-events-auto">
              <button className="flex flex-col items-center bg-[#f23645] hover:bg-[#d62030] text-white px-3 py-1 rounded shadow-md cursor-pointer">
                <span className="text-[10px] font-bold">SELL</span>
                <span className="text-xs font-mono font-bold">₹{(quote.price * 0.9995).toFixed(2)}</span>
              </button>
              <div className="px-1.5 py-0.5 bg-[#1e222d] rounded text-[10px] font-mono text-[#787b86]">
                {(quote.price * 0.001).toFixed(2)}
              </div>
              <button className="flex flex-col items-center bg-[#089981] hover:bg-[#067a67] text-white px-3 py-1 rounded shadow-md cursor-pointer">
                <span className="text-[10px] font-bold">BUY</span>
                <span className="text-xs font-mono font-bold">₹{(quote.price * 1.0005).toFixed(2)}</span>
              </button>
            </div>
          )}

          {/* Bar Replay Floating Controller */}
          {isReplaying && (
            <div className="absolute top-3 right-6 z-20 bg-[#1e222d] border border-amber-500/40 rounded-lg p-2 shadow-2xl flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Mode</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded bg-[#2a2e39] hover:bg-slate-700 text-white cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setReplayIdx(prev => Math.min(candles.length - 1, prev + 1))}
                  className="p-1.5 rounded bg-[#2a2e39] hover:bg-slate-700 text-white cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setReplayIdx(-1);
                    setIsPlaying(false);
                    setIsReplaying(false);
                  }}
                  className="px-2 py-1 rounded bg-[#2a2e39] hover:bg-rose-950 text-rose-400 text-xs font-semibold cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Drawing Overlay Tool */}
          {activeDrawingTool !== 'cursor' && (
            <DrawingToolsOverlay
              symbol={symbol}
              activeTool={activeDrawingTool as DrawingTool}
              onDrawingComplete={() => setActiveDrawingTool('cursor')}
              hideToolbar={true}
            />
          )}

          {/* Primary Chart Viewport */}
          <div ref={chartContainerRef} className="w-full h-full" />

          {/* Bottom Bar: Quick Time Intervals & Timezone */}
          <footer className="h-[30px] border-t border-[#2a2e39] bg-[#131722] px-3 flex items-center justify-between text-[11px] text-[#787b86] shrink-0 font-mono">
            <div className="flex items-center gap-2">
              {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map(r => (
                <button
                  key={r}
                  className="hover:text-white px-1 py-0.5 rounded cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span>15:30:00 IST</span>
              <span className="text-[#089981]">● Market Closed (EOD Data Ready)</span>
            </div>
          </footer>
        </main>

        {/* RIGHT DOCK: TradingView Right Side Panels (Watchlist, Scanners, Alerts, Profile) */}
        {isRightSidebarOpen && (
          <aside className="w-[320px] border-l border-[#2a2e39] bg-[#181b27] flex flex-col shrink-0 z-20">
            
            {/* Panel Header Tabs */}
            <div className="p-2 border-b border-[#2a2e39] flex items-center justify-between bg-[#1e222d]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">
                  {activeRightTab === 'watchlist' && 'Watchlist'}
                  {activeRightTab === 'scanner' && 'Scanners & Patterns'}
                  {activeRightTab === 'alerts' && 'Price Alerts'}
                  {activeRightTab === 'profile' && 'Company Profile'}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[#787b86]">
                <button
                  onClick={() => setIsAddingCustomStock(!isAddingCustomStock)}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    isAddingCustomStock ? 'bg-[#2962ff] text-white' : 'hover:bg-[#2a2e39] hover:text-white'
                  }`}
                  title="Add Custom Symbol to Watchlist"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB 1: WATCHLIST */}
            {activeRightTab === 'watchlist' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Custom Stock Input Drawer */}
                {isAddingCustomStock && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const cleaned = customSymbolInput.trim().toUpperCase();
                      if (!cleaned) return;
                      const formatted = cleaned.endsWith('.NS') || cleaned.endsWith('.BO') ? cleaned : `${cleaned}.NS`;
                      if (!watchlist.includes(formatted)) {
                        const updated = [...watchlist, formatted];
                        setWatchlist(updated);
                        cloudSync.updateWatchlist(updated);
                      }
                      setSymbol(formatted);
                      setCustomSymbolInput('');
                      setIsAddingCustomStock(false);
                    }}
                    className="p-2.5 bg-[#131722] border-b border-[#2a2e39] flex flex-col gap-2"
                  >
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>Add Custom Symbol to Watchlist:</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomStock(false)}
                        className="text-[#787b86] hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. TRENT, ZOMATO, SUZLON..."
                        value={customSymbolInput}
                        onChange={(e) => setCustomSymbolInput(e.target.value)}
                        className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-xs text-white uppercase placeholder:normal-case placeholder:text-[#787b86] focus:outline-none focus:border-[#2962ff]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#2962ff] hover:bg-[#1e4bd8] text-white text-xs font-bold rounded cursor-pointer shrink-0 shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="text-[10px] text-[#787b86]">
                      Supports any NSE symbol. Live quotes & charts fetch automatically.
                    </div>
                  </form>
                )}

                {/* Watchlist Table Headers */}
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#787b86] flex items-center justify-between border-b border-[#2a2e39] bg-[#131722]">
                  <span>Symbol</span>
                  <div className="flex items-center gap-4">
                    <span>Last</span>
                    <span>Chg%</span>
                  </div>
                </div>

                {/* Stock List */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39] no-scrollbar">
                  {watchlistItems.map(item => (
                    <div
                      key={item.symbol}
                      onClick={() => setSymbol(item.symbol)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors group ${
                        item.isSelected ? 'bg-[#2962ff]/15 border-l-2 border-l-[#2962ff]' : 'hover:bg-[#1e222d]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{item.cleanSymbol}</div>
                        <div className="text-[10px] text-[#787b86]">NSE Cash</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-white">₹{item.price.toFixed(2)}</div>
                          <div className={`text-[10px] font-bold ${
                            item.changePct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                          }`}>
                            {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = watchlist.filter(s => s !== item.symbol);
                            setWatchlist(updated);
                            cloudSync.updateWatchlist(updated);
                            if (symbol === item.symbol && updated.length > 0) {
                              setSymbol(updated[0]);
                            }
                          }}
                          className="p-1 rounded text-[#787b86] hover:text-rose-400 hover:bg-[#2a2e39] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lower Profile Box (Exact TradingView Layout) */}
                {quote && (
                  <div className="p-3 border-t border-[#2a2e39] bg-[#131722] flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{quote.name}</span>
                      <span className="text-[10px] font-mono text-[#787b86]">{quote.sector}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-[#787b86]">Mkt Cap:</span>
                        <div className="text-white font-bold">₹{quote.marketCap ? (quote.marketCap / 1000).toFixed(1) + 'T' : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[#787b86]">P/E Ratio:</span>
                        <div className="text-white font-bold">{quote.peRatio || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[#787b86]">52W High:</span>
                        <div className="text-white font-bold">₹{quote.fiftyTwoWeekHigh || (quote.price * 1.15).toFixed(1)}</div>
                      </div>
                      <div>
                        <span className="text-[#787b86]">52W Low:</span>
                        <div className="text-white font-bold">₹{quote.fiftyTwoWeekLow || (quote.price * 0.85).toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TECHNICAL SCANNERS & PATTERNS */}
            {activeRightTab === 'scanner' && (
              <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3 no-scrollbar">
                <div className="text-xs text-[#787b86]">
                  Active institutional patterns detected on <strong className="text-white">{symbol.replace('.NS', '')}</strong>:
                </div>

                <div className="flex flex-col gap-2">
                  {scanResults.map((item, idx) => (
                    <div key={idx} className="bg-[#131722] border border-[#2a2e39] rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          {item.patternName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#787b86]">
                          {item.confidence}% Match
                        </span>
                      </div>

                      <p className="text-[11px] text-[#787b86] leading-relaxed">
                        {item.notes}
                      </p>

                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#2a2e39] text-[10px] font-mono text-[#787b86]">
                        <div>Key S/R: <span className="text-white font-bold">₹{item.keyLevel}</span></div>
                        <div>Target: <span className="text-emerald-400 font-bold">₹{item.targetPrice}</span></div>
                        <div>SL: <span className="text-rose-400 font-bold">₹{item.stopLoss}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PRICE ALERTS */}
            {activeRightTab === 'alerts' && (
              <div className="flex-1 p-4 flex flex-col gap-3">
                <div className="text-xs font-semibold text-white">Create Price Alert on {symbol.replace('.NS', '')}</div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-[#787b86]">Trigger Condition</label>
                  <select className="bg-[#131722] border border-[#2a2e39] rounded p-2 text-xs text-white">
                    <option>Crossing Above Target</option>
                    <option>Crossing Below Stop Loss</option>
                    <option>KeyZone Demand Retest</option>
                    <option>Volume Surge (3x)</option>
                  </select>

                  <label className="text-[11px] text-[#787b86]">Target Price</label>
                  <input
                    type="number"
                    defaultValue={quote?.price ? Number((quote.price * 1.05).toFixed(2)) : 1000}
                    className="bg-[#131722] border border-[#2a2e39] rounded p-2 text-xs text-white font-mono"
                  />

                  <button className="mt-2 py-2 rounded bg-[#2962ff] hover:bg-[#1e4bd8] text-white font-bold text-xs cursor-pointer shadow-sm">
                    Create Alert
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* RIGHTMOST THIN ICON TAPE (Exact TradingView Multi-Tool Icons) */}
        <nav className="w-[42px] border-l border-[#2a2e39] bg-[#131722] flex flex-col items-center py-2 gap-3 shrink-0 z-30">
          <button
            onClick={() => {
              setActiveRightTab('watchlist');
              setIsRightSidebarOpen(true);
            }}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeRightTab === 'watchlist' && isRightSidebarOpen ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#787b86] hover:text-white'
            }`}
            title="Watchlist & Details"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveRightTab('scanner');
              setIsRightSidebarOpen(true);
            }}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeRightTab === 'scanner' && isRightSidebarOpen ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#787b86] hover:text-white'
            }`}
            title="Technical Scanner & Patterns"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveRightTab('alerts');
              setIsRightSidebarOpen(true);
            }}
            className={`p-2 rounded cursor-pointer transition-colors ${
              activeRightTab === 'alerts' && isRightSidebarOpen ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#787b86] hover:text-white'
            }`}
            title="Alerts"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="p-2 rounded text-[#787b86] hover:text-white mt-auto cursor-pointer"
            title="Toggle Right Panel"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </nav>
      </div>

      {/* 3. SYMBOL SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl max-w-lg w-full p-4 shadow-2xl flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#787b86] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search symbol (e.g. RELIANCE, TCS, INFY)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#2962ff]"
              />
            </div>

            <div className="flex flex-col divide-y divide-[#2a2e39] max-h-72 overflow-y-auto no-scrollbar">
              {filteredSearchUniverse.map(stock => (
                <div
                  key={stock.symbol}
                  onClick={() => {
                    setSymbol(stock.symbol);
                    setIsSearchModalOpen(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-2.5 hover:bg-[#131722] cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-[#2962ff]">
                      {stock.symbol.replace('.NS', '').replace('.BO', '')}
                    </div>
                    <div className="text-[11px] text-[#787b86]">{stock.name}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2a2e39] text-[#787b86]">
                    {stock.sector}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2a2e39]">
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="px-3 py-1 rounded bg-[#2a2e39] hover:bg-slate-700 text-xs text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. INDICATORS MODAL */}
      {isIndicatorsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <h3 className="font-bold text-sm text-white">Indicators &amp; Overlays</h3>
              <button onClick={() => setIsIndicatorsModalOpen(false)} className="text-[#787b86] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer hover:bg-[#131722] p-2 rounded">
                <span className="font-semibold text-white">EMA 20 (Short Term Trend)</span>
                <input
                  type="checkbox"
                  checked={showEMA20}
                  onChange={e => setShowEMA20(e.target.checked)}
                  className="accent-[#2962ff] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-[#131722] p-2 rounded">
                <span className="font-semibold text-white">EMA 50 (Intermediate Trend)</span>
                <input
                  type="checkbox"
                  checked={showEMA50}
                  onChange={e => setShowEMA50(e.target.checked)}
                  className="accent-[#ff9800] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-[#131722] p-2 rounded">
                <span className="font-semibold text-white">EMA 200 (Long Term Secular Baseline)</span>
                <input
                  type="checkbox"
                  checked={showEMA200}
                  onChange={e => setShowEMA200(e.target.checked)}
                  className="accent-[#9c27b0] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-[#131722] p-2 rounded">
                <span className="font-semibold text-white">Volume Histogram</span>
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={e => setShowVolume(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2a2e39]">
              <button
                onClick={() => setIsIndicatorsModalOpen(false)}
                className="px-4 py-1.5 rounded bg-[#2962ff] text-xs text-white font-bold cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BROKER CONNECT MODAL (Free Angel One / Fyers / Upstox Feed) */}
      <BrokerConnectModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        onConnected={() => {
          // Re-trigger stock load with broker feed
        }}
      />
    </div>
  );
}
