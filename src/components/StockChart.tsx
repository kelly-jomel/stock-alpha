'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { Layers, Activity, Eye, BarChart2, TrendingUp, Compass } from 'lucide-react';

interface Props {
  candles: Candle[];
  technicals?: TechnicalIndicators;
  symbol: string;
}

export default function StockChart({ candles, technicals, symbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  // Free Indicators Toggles (Only standard non-paid indicators)
  const [showEMA, setShowEMA] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showSuperTrend, setShowSuperTrend] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  // Main Candlestick Chart
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
      timeScale: { borderColor: '#e2e8f0', timeVisible: true },
      rightPriceScale: { borderColor: '#e2e8f0' },
      width: chartContainerRef.current.clientWidth,
      height: 420
    });

    const sortedCandles = [...candles].sort((a, b) => (a.time > b.time ? 1 : -1));
    const chartData = sortedCandles.map(c => ({
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

    const times = sortedCandles.map(c => c.time);
    const closes = sortedCandles.map(c => c.close);
    const highs = sortedCandles.map(c => c.high);
    const lows = sortedCandles.map(c => c.low);

    // 1. Free Indicator: Volume
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#e2e8f0',
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      const volumeData = sortedCandles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0, 208, 156, 0.28)' : 'rgba(239, 68, 68, 0.28)'
      }));
      volumeSeries.setData(volumeData);
    }

    // 2. Free Indicator: Exponential Moving Averages (20, 50, 200 EMA)
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

    // 3. Free Indicator: Simple Moving Average (SMA 50 & 200)
    if (showSMA && closes.length >= 50) {
      const sma50Values = calculateSMA(closes, 50);
      const smaLine = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, title: 'SMA 50' });
      smaLine.setData(times.map((t, i) => ({ time: t, value: sma50Values[i] })));
    }

    // 4. Free Indicator: Bollinger Bands (20, 2)
    if (showBollinger && closes.length >= 20) {
      const bbData = calculateBollingerBands(times, closes, 20, 2);
      const upperLine = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1, title: 'BB Upper' });
      const middleLine = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, lineStyle: 2, title: 'BB Mid' });
      const lowerLine = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1, title: 'BB Lower' });

      upperLine.setData(bbData.map(b => ({ time: b.time, value: b.upper })));
      middleLine.setData(bbData.map(b => ({ time: b.time, value: b.middle })));
      lowerLine.setData(bbData.map(b => ({ time: b.time, value: b.lower })));
    }

    // 5. Free Indicator: SuperTrend (10, 3)
    if (showSuperTrend && closes.length >= 10) {
      const stData = calculateSuperTrend(times, highs, lows, closes, 10, 3);
      const stLine = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: 'SuperTrend' });
      stLine.setData(stData.map(s => ({ time: s.time, value: s.value })));
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
  }, [candles, showEMA, showSMA, showBollinger, showSuperTrend, showVolume]);

  // Separate Sub-Chart for RSI 14
  useEffect(() => {
    if (!rsiContainerRef.current || !showRSI || candles.length < 15) return;

    const rsiChart = createChart(rsiContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#64748b' },
      grid: { vertLines: { color: '#f8fafc' }, horzLines: { color: '#f8fafc' } },
      timeScale: { borderColor: '#e2e8f0', timeVisible: true },
      rightPriceScale: { borderColor: '#e2e8f0' },
      width: rsiContainerRef.current.clientWidth,
      height: 140
    });

    const sortedCandles = [...candles].sort((a, b) => (a.time > b.time ? 1 : -1));
    const rsiPoints = calculateRSIFull(sortedCandles.map(c => c.time), sortedCandles.map(c => c.close), 14);

    const rsiLine = rsiChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, title: 'RSI 14' });
    rsiLine.setData(rsiPoints);

    // Overbought 70 and Oversold 30 reference levels
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
  }, [candles, showRSI]);

  return (
    <div className="space-y-4">
      {/* Main Chart Container */}
      <div className="relative w-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Header & Indicator Toggles */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-base text-slate-900">{symbol.replace('.NS', '')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Live Daily Candlestick
            </span>
            {technicals?.maConvergence.isConverging && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                ⚡ Squeeze ({technicals.maConvergence.spreadPercent}%)
              </span>
            )}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
            <span className="text-slate-400 mr-1 text-[11px] font-sans">Free Indicators:</span>

            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showEMA ? 'bg-sky-50 text-sky-700 border-sky-200 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              EMA (20/50)
            </button>

            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showSMA ? 'bg-purple-50 text-purple-700 border-purple-200 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              SMA (50)
            </button>

            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showBollinger ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              Bollinger Bands
            </button>

            <button
              onClick={() => setShowSuperTrend(!showSuperTrend)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showSuperTrend ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              SuperTrend (10, 3)
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showVolume ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              Volume
            </button>

            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                showRSI ? 'bg-violet-50 text-violet-700 border-violet-200 font-bold' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              RSI Sub-chart
            </button>
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
