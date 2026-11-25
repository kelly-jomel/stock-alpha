'use client';

import React from 'react';

interface Props {
  data: number[];
  isPositive?: boolean;
  width?: number;
  height?: number;
}

export default function MiniSparkline({
  data,
  isPositive = true,
  width = 90,
  height = 30
}: Props) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Build SVG path
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const strokeColor = isPositive ? '#00d09c' : '#ef4444';
  const fillColor = isPositive ? 'rgba(0, 208, 156, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={fillD} fill={fillColor} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
