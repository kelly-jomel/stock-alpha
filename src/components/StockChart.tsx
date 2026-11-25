'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  IChartApi
} from 'lightweight-charts';
import { Candle, TechnicalIndicators } from '@/types/stock';
import { calculateBollingerBands, calculateSuperTrend, calculateSMA, calculateRSIFull } from '@/lib/freeIndicators';
import {
  Layers,
  Activity,
  Eye,
  BarChart2,
  TrendingUp,
  Compass,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Clock,
  Crosshair,
  Maximize2
} from 'lucide-react';

interface Props {
  candles: Candle[];
  technicals?: TechnicalIndicators;
  symbol: string;
  onTimeframeChange?: (range: string, interval: string) => void;
  activeInterval?: string;
}

export default function StockChart({
  candles,
  technicals,
  symbol,
  onTimeframeChange,
  activeInterval = '1d'
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  // Indicators Toggles
  const [showEMA, setShowEMA] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showSuperTrend, setShowSuperTrend] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showPivots, setShowPivots] = useState(false);
  const [pivotType, setPivotType] = useState<'classic' | 'camarilla' | 'woodie' | 'fibonacci'>('classic');

  // Timeframe selector state
  const [selectedInterval, setSelectedInterval] = useState(activeInterval);

  // Bar Replay Engine State
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState<number>(candles.length);
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // 1x, 2x, 4x
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sortedAllCandles = useMemo(() => {
    return [...candles].sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [candles]);

  // Sliced candles for Bar Replay
  const displayedCandles = useMemo(() => {
    if (!isReplaying) return sortedAllCandles;
    return sortedAllCandles.slice(0, Math.max(10, Math.min(replayIndex, sortedAllCandles.length)));
  }, [sortedAllCandles, isReplaying, replayIndex]);

  // Keep replayIndex in sync when candles change
  useEffect(() => {
    if (!isReplaying) {
      setReplayIndex(sortedAllCandles.length);
    }
  }, [sortedAllCandles.length, isReplaying]);

  // Replay play loop
  useEffect(() => {
    if (isPlaying && isReplaying) {
      const intervalMs = Math.max(100, Math.round(800 / replaySpeed));
      replayTimerRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= sortedAllCandles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlaying, isReplaying, replaySpeed, sortedAllCandles.length]);

  const handleStartReplay = () => {
    if (!isReplaying) {
      setIsReplaying(true);
      // Start at 60% of history
      setReplayIndex(Math.max(10, Math.floor(sortedAllCandles.length * 0.6)));
      setIsPlaying(false);
    } else {
      setIsReplaying(false);
      setIsPlaying(false);
      setReplayIndex(sortedAllCandles.length);
    }
  };

  const handleStepForward = () => {
    setReplayIndex(prev => Math.min(sortedAllCandles.length, prev + 1));
  };

  const handleResetReplay = () => {
    setReplayIndex(Math.max(10, Math.floor(sortedAllCandles.length * 0.5)));
    setIsPlaying(false);
  };

  const handleTimeframeClick = (range: string, interval: string) => {
    setSelectedInterval(interval);
    if (onTimeframeChange) {
      onTimeframeChange(range, interval);
    }
  };

  // Main Candlestick Chart Rendering
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b'
      },
      grid: {
        vertLines: { color: '#f8fafc' },
        horzLines: { color: '#f8fafc' }
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit'
          });
        },
        dateFormat: 'dd MMM yyyy'
      },
      rightPriceScale: { borderColor: '#e2e8f0' },
      width: chartContainerRef.current.clientWidth,
      height: 420
    });

    const chartData = displayedCandles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00d09c',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#00d09c',
      wickDownColor: '#ef4444'
    });
    candleSeries.setData(chartData);

    const times = displayedCandles.map(c => c.time);
    const closes = displayedCandles.map(c => c.close);
    const highs = displayedCandles.map(c => c.high);
    const lows = displayedCandles.map(c => c.low);

    // 1. Volume Histogram
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#e2e8f0',
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      const volumeData = displayedCandles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0, 208, 156, 0.28)' : 'rgba(239, 68, 68, 0.28)'
      }));
      volumeSeries.setData(volumeData);
    }

    // 2. Exponential Moving Averages (20, 50 EMA)
    if (showEMA && closes.length >= 20) {
      const ema20Line = chart.addSeries(LineSeries, { color: '#0284c7', lineWidth: 2, title: 'EMA 20' });
      const ema50Line = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'EMA 50' });

      let e20 = closes[0];
      let e50 = closes[0];
      const k20 = 2 / (20 + 1);
      const k50 = 2 / (50 + 1);

      const ema20Data = chartData.map(c => {
        e20 = c.close * k20 + e20 * (1 - k20);
        return { time: c.time, value: Number(e20.toFixed(2)) };
      });
      const ema50Data = chartData.map(c => {
        e50 = c.close * k50 + e50 * (1 - k50);
        return { time: c.time, value: Number(e50.toFixed(2)) };
      });

      ema20Line.setData(ema20Data);
      ema50Line.setData(ema50Data);
    }

    // 3. Simple Moving Average (SMA 50)
    if (showSMA && closes.length >= 50) {
      const sma50Values = calculateSMA(closes, 50);
      const smaLine = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, title: 'SMA 50' });
      smaLine.setData(times.map((t, i) => ({ time: t, value: sma50Values[i] })));
    }

    // 4. Bollinger Bands (20, 2)
    if (showBollinger && closes.length >= 20) {
      const bbData = calculateBollingerBands(times, closes, 20, 2);
      const upperLine = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1, title: 'BB Upper' });
      const middleLine = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, lineStyle: 2, title: 'BB Mid' });
      const lowerLine = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1, title: 'BB Lower' });

      upperLine.setData(bbData.map(b => ({ time: b.time, value: b.upper })));
      middleLine.setData(bbData.map(b => ({ time: b.time, value: b.middle })));
      lowerLine.setData(bbData.map(b => ({ time: b.time, value: b.lower })));
    }

    // 5. SuperTrend (10, 3)
    if (showSuperTrend && closes.length >= 10) {
      const stData = calculateSuperTrend(times, highs, lows, closes, 10, 3);
      const stLine = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: 'SuperTrend' });
      stLine.setData(stData.map(s => ({ time: s.time, value: s.value })));
    }

    // 6. Alpha Pivot Points Overlay (P, R1, R2, S1, S2)
    if (showPivots && technicals?.pivots && times.length > 0) {
      const pData = technicals.pivots[pivotType];
      if (pData) {
        // Plot horizontal pivot lines across the latest segment
        const pLine = chart.addSeries(LineSeries, { color: '#eab308', lineWidth: 1, lineStyle: 2, title: `P (${pData.p})` });
        const r1Line = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineStyle: 0, title: `R1 (${pData.r1})` });
        const s1Line = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, lineStyle: 0, title: `S1 (${pData.s1})` });

        pLine.setData(times.map(t => ({ time: t, value: pData.p })));
        r1Line.setData(times.map(t => ({ time: t, value: pData.r1 })));
        s1Line.setData(times.map(t => ({ time: t, value: pData.s1 })));
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [displayedCandles, showEMA, showSMA, showBollinger, showSuperTrend, showVolume, showPivots, pivotType, technicals]);

  // RSI Sub-Chart Rendering
  useEffect(() => {
    if (!rsiContainerRef.current || !showRSI || displayedCandles.length < 15) return;

    const rsiChart = createChart(rsiContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#64748b' },
      grid: { vertLines: { color: '#f8fafc' }, horzLines: { color: '#f8fafc' } },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit'
          });
        },
        dateFormat: 'dd MMM yyyy'
      },
      rightPriceScale: { borderColor: '#e2e8f0' },
      width: rsiContainerRef.current.clientWidth,
      height: 140
    });

    const rsiPoints = calculateRSIFull(displayedCandles.map(c => c.time), displayedCandles.map(c => c.close), 14);

    const rsiLine = rsiChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, title: 'RSI 14' });
    rsiLine.setData(rsiPoints);

    const overboughtLine = rsiChart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineStyle: 2, title: '70 Overbought' });
    const oversoldLine = rsiChart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, lineStyle: 2, title: '30 Oversold' });
    overboughtLine.setData(rsiPoints.map(p => ({ time: p.time, value: 70 })));
    oversoldLine.setData(rsiPoints.map(p => ({ time: p.time, value: 30 })));

    rsiChart.timeScale().fitContent();
    rsiChartRef.current = rsiChart;

    const handleResizeRsi = () => {
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResizeRsi);

    return () => {
      window.removeEventListener('resize', handleResizeRsi);
      rsiChart.remove();
    };
  }, [displayedCandles, showRSI]);

  return (
    <div className="space-y-4">
      {/* Main Chart Container */}
      <div className="relative w-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Header Bar with Symbol, Timeframe Switcher & Bar Replay Controls */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="font-bold text-base text-slate-900">{symbol.replace('.NS', '')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              NSE
            </span>

            {/* Timeframe Switcher (Intraday & Swing) */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold text-slate-600">
              <button
                onClick={() => handleTimeframeClick('1d', '5m')}
                className={`px-2 py-0.5 rounded-md transition-all ${selectedInterval === '5m' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                5m
              </button>
              <button
                onClick={() => handleTimeframeClick('5d', '15m')}
                className={`px-2 py-0.5 rounded-md transition-all ${selectedInterval === '15m' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                15m
              </button>
              <button
                onClick={() => handleTimeframeClick('1mo', '60m')}
                className={`px-2 py-0.5 rounded-md transition-all ${selectedInterval === '60m' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                1h
              </button>
              <button
                onClick={() => handleTimeframeClick('1y', '1d')}
                className={`px-2 py-0.5 rounded-md transition-all ${selectedInterval === '1d' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                1D
              </button>
              <button
                onClick={() => handleTimeframeClick('2y', '1wk')}
                className={`px-2 py-0.5 rounded-md transition-all ${selectedInterval === '1wk' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                1W
              </button>
            </div>

            {technicals?.maConvergence.isConverging && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                ⚡ Squeeze ({technicals.maConvergence.spreadPercent}%)
              </span>
            )}
            {technicals?.gaps?.hasGap && (
              <span className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${
                technicals.gaps.type === 'GAP_UP'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {technicals.gaps.type === 'GAP_UP' ? '↗ Gap Up' : '↘ Gap Down'} ({technicals.gaps.gapSizePercent}%)
              </span>
            )}
          </div>

          {/* Alpha Interactive Bar Replay Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleStartReplay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                isReplaying
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {isReplaying ? 'Exit Replay' : 'Bar Replay'}
            </button>

            {isReplaying && (
              <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200 rounded-xl px-2 py-1">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                </button>
                <button
                  onClick={handleStepForward}
                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition-colors"
                  title="Step 1 Bar Forward"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetReplay}
                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition-colors"
                  title="Reset to Midpoint"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <select
                  value={replaySpeed}
                  onChange={(e) => setReplaySpeed(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-bold text-amber-900 border-none outline-none cursor-pointer"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
                <span className="text-[10px] text-amber-700 font-mono ml-1">
                  Bar {replayIndex}/{sortedAllCandles.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Indicator Toggles Bar */}
        <div className="flex items-center gap-1.5 flex-wrap px-5 py-2 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold">
          <span className="text-slate-400 mr-1 text-[11px]">Indicators:</span>

          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showEMA ? 'bg-sky-50 text-sky-700 border-sky-200 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            EMA (20/50)
          </button>

          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showSMA ? 'bg-purple-50 text-purple-700 border-purple-200 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            SMA (50)
          </button>

          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showBollinger ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            Bollinger Bands
          </button>

          <button
            onClick={() => setShowSuperTrend(!showSuperTrend)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showSuperTrend ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            SuperTrend
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showVolume ? 'bg-slate-200 text-slate-800 border-slate-300 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            Volume
          </button>

          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              showRSI ? 'bg-violet-50 text-violet-700 border-violet-200 font-bold' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            RSI
          </button>

          {/* Alpha Pivots Toggle & Selector */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setShowPivots(!showPivots)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showPivots ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold' : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              Pivot Points
            </button>
            {showPivots && (
              <select
                value={pivotType}
                onChange={(e) => setPivotType(e.target.value as any)}
                className="bg-white border border-amber-200 text-amber-800 text-[11px] rounded-lg px-2 py-1 outline-none font-semibold cursor-pointer"
              >
                <option value="classic">Classic Floor</option>
                <option value="camarilla">Camarilla</option>
                <option value="woodie">Woodie</option>
                <option value="fibonacci">Fibonacci</option>
              </select>
            )}
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full h-[420px]" />
      </div>

      {/* Free Indicator: RSI 14 Sub-Chart */}
      {showRSI && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
              RSI (Relative Strength Index 14)
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-rose-500">70: Overbought</span>
              <span className="text-emerald-600">30: Oversold</span>
              <span className="text-slate-500">Current RSI: <strong>{technicals?.rsi14}</strong></span>
            </div>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[140px]" />
        </div>
      )}
    </div>
  );
}
