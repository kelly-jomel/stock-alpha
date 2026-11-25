'use client';

import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';

export interface SectorItem {
  sector: string;
  percent: number;
  value?: number;
}

interface Props {
  data: SectorItem[];
  totalValue?: number;
}

const SECTOR_PALETTE = [
  '#10b981', // Emerald (Groww primary)
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#64748b'  // Slate
];

export default function SectorPieChart({ data, totalValue }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
        No active holdings data to chart.
      </div>
    );
  }

  // Calculate SVG Pie/Donut Slices
  let cumulativePercent = 0;
  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
          <PieIcon className="w-4 h-4 text-emerald-600" /> Sector Allocation Breakdown
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {data.length} Sectors
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Interactive SVG Donut Chart */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {data.map((item, idx) => {
              const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercent / 100) * circumference);
              cumulativePercent += item.percent;
              const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length];
              const isHovered = hoveredIndex === idx;

              return (
                <circle
                  key={item.sector}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            {hoveredIndex != null && data[hoveredIndex] ? (
              <>
                <div className="text-[10px] text-slate-400 uppercase font-bold truncate max-w-[90px]">
                  {data[hoveredIndex].sector}
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {data[hoveredIndex].percent}%
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Top Sector</div>
                <div className="text-sm font-bold text-slate-900 font-mono truncate max-w-[100px] mt-0.5">
                  {data[0]?.sector}
                </div>
                <div className="text-xs text-emerald-600 font-mono font-bold">
                  {data[0]?.percent}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend Pills with Color Dots */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, idx) => {
            const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length];
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={item.sector}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-xs ${
                  isHovered
                    ? 'bg-slate-50 border-slate-300 shadow-2xs translate-x-1'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-slate-800 truncate">{item.sector}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="font-bold text-slate-900">{item.percent}%</span>
                  {totalValue && (
                    <span className="text-[11px] text-slate-400 hidden md:inline">
                      (₹{((totalValue * item.percent) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
