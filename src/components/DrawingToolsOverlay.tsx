'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChartDrawing } from '@/types/sync';
import { cloudSync } from '@/lib/cloudSync';
import {
  TrendingUp,
  Minus,
  Layers,
  Trash2,
  BookmarkCheck,
  Check,
  X
} from 'lucide-react';

export type DrawingTool = 'NONE' | 'HORIZONTAL_LINE' | 'TRENDLINE' | 'FIBONACCI' | 'cursor' | 'line' | 'fib' | 'text' | 'eraser' | 'trendline' | 'fibonacci' | 'horizontal';

export interface DrawingOverlayProps {
  symbol: string;
  minPrice?: number;
  maxPrice?: number;
  containerHeight?: number;
  activeTool?: DrawingTool;
  onDrawingComplete?: () => void;
  hideToolbar?: boolean;
}

export default function DrawingToolsOverlay({
  symbol,
  minPrice = 0,
  maxPrice = 1000,
  containerHeight = 420,
  activeTool: externalActiveTool,
  onDrawingComplete,
  hideToolbar = false
}: DrawingOverlayProps) {
  const [internalActiveTool, setInternalActiveTool] = useState<'NONE' | 'HORIZONTAL_LINE' | 'TRENDLINE' | 'FIBONACCI'>('NONE');

  // Map external tool names (e.g., 'line', 'fib', 'HORIZONTAL_LINE') to internal mode
  const activeTool = useMemo(() => {
    if (externalActiveTool !== undefined) {
      if (externalActiveTool === 'line' || externalActiveTool === 'trendline') return 'TRENDLINE';
      if (externalActiveTool === 'fib' || externalActiveTool === 'fibonacci') return 'FIBONACCI';
      if (externalActiveTool === 'horizontal' || externalActiveTool === 'HORIZONTAL_LINE') return 'HORIZONTAL_LINE';
      if (externalActiveTool === 'cursor' || externalActiveTool === 'eraser' || externalActiveTool === 'text') return 'NONE';
      return externalActiveTool as 'NONE' | 'HORIZONTAL_LINE' | 'TRENDLINE' | 'FIBONACCI';
    }
    return internalActiveTool;
  }, [externalActiveTool, internalActiveTool]);

  const setActiveTool = (tool: 'NONE' | 'HORIZONTAL_LINE' | 'TRENDLINE' | 'FIBONACCI') => {
    setInternalActiveTool(tool);
    if (tool === 'NONE' && onDrawingComplete) {
      onDrawingComplete();
    }
  };
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [currentLineStart, setCurrentLineStart] = useState<{ xPercent: number; price: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load existing drawings for this symbol from CloudSync
  useEffect(() => {
    const loadDrawings = () => {
      setDrawings(cloudSync.getDrawingsForSymbol(symbol));
    };

    loadDrawings();
    return cloudSync.subscribeData(loadDrawings);
  }, [symbol]);

  // Convert mouse Y coordinate to price
  const yToPrice = (y: number, height: number): number => {
    if (height <= 0 || maxPrice <= minPrice) return minPrice;
    const ratio = (height - y) / height;
    return Number((minPrice + ratio * (maxPrice - minPrice)).toFixed(2));
  };

  // Convert price to Y pixel offset
  const priceToY = (price: number, height: number): number => {
    if (maxPrice <= minPrice) return 0;
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return height - ratio * height;
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'NONE' || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const price = yToPrice(y, rect.height);

    if (activeTool === 'HORIZONTAL_LINE') {
      const newDrawing: ChartDrawing = {
        id: 'h_' + Date.now(),
        symbol,
        type: 'HORIZONTAL_LINE',
        points: [{ price, yPercent: (y / rect.height) * 100 }],
        color: '#f59e0b',
        label: `Key Level: ₹${price}`,
        createdAt: Date.now()
      };
      cloudSync.saveDrawing(newDrawing);
      setActiveTool('NONE');
    } else if (activeTool === 'TRENDLINE' || activeTool === 'FIBONACCI') {
      if (!currentLineStart) {
        // Point 1
        setCurrentLineStart({ xPercent, price });
      } else {
        // Point 2 - finish line
        const newDrawing: ChartDrawing = {
          id: (activeTool === 'FIBONACCI' ? 'fib_' : 'tl_') + Date.now(),
          symbol,
          type: activeTool,
          points: [
            { price: currentLineStart.price, xPercent: currentLineStart.xPercent },
            { price, xPercent }
          ],
          color: activeTool === 'FIBONACCI' ? '#8b5cf6' : '#3b82f6',
          label: activeTool === 'FIBONACCI' ? 'Fibonacci Retracement' : 'Trendline',
          createdAt: Date.now()
        };
        cloudSync.saveDrawing(newDrawing);
        setCurrentLineStart(null);
        setActiveTool('NONE');
      }
    }
  };

  const handleRemoveDrawing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cloudSync.removeDrawing(id);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    cloudSync.clearDrawingsForSymbol(symbol);
  };

  return (
    <>
      {/* Top Drawing Toolbar */}
      {!hideToolbar && (
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl px-2 py-1 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] mr-1 hidden sm:inline">Tools:</span>
        <button
          onClick={() => {
            setActiveTool(activeTool === 'HORIZONTAL_LINE' ? 'NONE' : 'HORIZONTAL_LINE');
            setCurrentLineStart(null);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
            activeTool === 'HORIZONTAL_LINE'
              ? 'bg-amber-500 text-white font-bold shadow-xs'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Place Horizontal Support/Resistance Line"
        >
          <Minus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Key Zone / Line</span>
        </button>

        <button
          onClick={() => {
            setActiveTool(activeTool === 'TRENDLINE' ? 'NONE' : 'TRENDLINE');
            setCurrentLineStart(null);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
            activeTool === 'TRENDLINE'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Draw Trendline between 2 points"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Trendline</span>
        </button>

        <button
          onClick={() => {
            setActiveTool(activeTool === 'FIBONACCI' ? 'NONE' : 'FIBONACCI');
            setCurrentLineStart(null);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
            activeTool === 'FIBONACCI'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Draw Fibonacci Retracement (High to Low)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Fibonacci</span>
        </button>

        {drawings.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-all ml-auto"
            title="Clear all drawings for this stock"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Clear ({drawings.length})</span>
          </button>
        )}
      </div>
      )}

      {/* SVG Canvas Overlay on Top of the Chart */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`absolute inset-0 z-10 ${
          activeTool !== 'NONE' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ height: containerHeight || 420 }}
      >
        <svg className="w-full h-full overflow-hidden">
          {drawings.map(d => {
            if (d.type === 'HORIZONTAL_LINE' && d.points[0]) {
              const y = priceToY(d.points[0].price, containerHeight || 420);
              return (
                <g key={d.id} className="pointer-events-auto group">
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke={d.color || '#f59e0b'}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  <rect
                    x="8"
                    y={Math.max(2, y - 18)}
                    width="120"
                    height="18"
                    rx="4"
                    fill="#1e293b"
                    opacity="0.9"
                  />
                  <text
                    x="12"
                    y={Math.max(14, y - 5)}
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ₹{d.points[0].price} (Sync)
                  </text>
                  <circle
                    cx="135"
                    cy={y - 9}
                    r="6"
                    fill="#ef4444"
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemoveDrawing(d.id, e)}
                  />
                  <text
                    x="133"
                    y={y - 6}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  >
                    ×
                  </text>
                </g>
              );
            }

            if (d.type === 'TRENDLINE' && d.points.length >= 2) {
              const p1 = d.points[0];
              const p2 = d.points[1];
              const y1 = priceToY(p1.price, containerHeight || 420);
              const y2 = priceToY(p2.price, containerHeight || 420);
              return (
                <g key={d.id} className="pointer-events-auto group">
                  <line
                    x1={`${p1.xPercent || 10}%`}
                    y1={y1}
                    x2={`${p2.xPercent || 90}%`}
                    y2={y2}
                    stroke={d.color || '#3b82f6'}
                    strokeWidth="2"
                  />
                  <circle
                    cx={`${p2.xPercent || 90}%`}
                    cy={y2}
                    r="6"
                    fill="#ef4444"
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemoveDrawing(d.id, e)}
                  />
                </g>
              );
            }

            if (d.type === 'FIBONACCI' && d.points.length >= 2) {
              const p1 = d.points[0];
              const p2 = d.points[1];
              const highPrice = Math.max(p1.price, p2.price);
              const lowPrice = Math.min(p1.price, p2.price);
              const diff = highPrice - lowPrice;
              const fibLevels = [
                { ratio: 0, label: '0.0% (₹' + highPrice.toFixed(1) + ')', color: '#6366f1' },
                { ratio: 0.236, label: '23.6%', color: '#3b82f6' },
                { ratio: 0.382, label: '38.2%', color: '#06b6d4' },
                { ratio: 0.5, label: '50.0%', color: '#10b981' },
                { ratio: 0.618, label: '61.8% (Golden)', color: '#f59e0b' },
                { ratio: 0.786, label: '78.6%', color: '#f97316' },
                { ratio: 1.0, label: '100% (₹' + lowPrice.toFixed(1) + ')', color: '#ef4444' }
              ];

              return (
                <g key={d.id} className="pointer-events-auto group">
                  {fibLevels.map(f => {
                    const levelPrice = highPrice - diff * f.ratio;
                    const y = priceToY(levelPrice, containerHeight || 420);
                    return (
                      <g key={f.ratio}>
                        <line
                          x1="0"
                          y1={y}
                          x2="100%"
                          y2={y}
                          stroke={f.color}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="98%"
                          y={y - 3}
                          textAnchor="end"
                          fill={f.color}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {f.label} - ₹{levelPrice.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}
                  <circle
                    cx="95%"
                    cy={priceToY(highPrice, containerHeight || 420)}
                    r="7"
                    fill="#ef4444"
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemoveDrawing(d.id, e)}
                  />
                </g>
              );
            }

            return null;
          })}

          {/* Active drawing guide preview */}
          {currentLineStart && (
            <circle
              cx={`${currentLineStart.xPercent}%`}
              cy={priceToY(currentLineStart.price, containerHeight || 420)}
              r="4"
              fill="#3b82f6"
              className="animate-ping"
            />
          )}
        </svg>

        {activeTool !== 'NONE' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-2">
            <span>
              {activeTool === 'HORIZONTAL_LINE'
                ? 'Click on the chart to place Key Level'
                : !currentLineStart
                ? 'Click first point'
                : 'Click second point to finish'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTool('NONE');
                setCurrentLineStart(null);
              }}
              className="hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
