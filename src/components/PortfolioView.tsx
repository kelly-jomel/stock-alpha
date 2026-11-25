'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PortfolioHolding } from '@/types/portfolio';
import { calculatePortfolioAnalytics } from '@/lib/portfolioAnalytics';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import { parseExcelHoldings, parsePdfHoldings, ParsedHoldingItem } from '@/lib/fileImportParser';
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  PieChart,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Award,
  FileSpreadsheet,
  Upload,
  Download
} from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
}

const DEFAULT_HOLDINGS: Array<{ symbol: string; shares: number; avgBuy: number }> = [
  { symbol: 'RELIANCE.NS', shares: 50, avgBuy: 1310.0 },
  { symbol: 'TCS.NS', shares: 30, avgBuy: 2420.0 },
  { symbol: 'HDFCBANK.NS', shares: 60, avgBuy: 810.0 },
  { symbol: 'TATAMOTORS.NS', shares: 100, avgBuy: 740.0 },
  { symbol: 'ICICIBANK.NS', shares: 45, avgBuy: 1220.0 }
];

export default function PortfolioView({ onSelectStock }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // New holding form state
  const [newSymbol, setNewSymbol] = useState(STOCK_UNIVERSE[0].symbol);
  const [newShares, setNewShares] = useState('20');
  const [newAvgBuy, setNewAvgBuy] = useState('1000');
  const [addingLoading, setAddingLoading] = useState(false);

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedHoldingItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Load holdings from localStorage or fallback
  useEffect(() => {
    async function loadPortfolio() {
      setLoading(true);
      const saved = localStorage.getItem('keystock_portfolio');
      let baseList = DEFAULT_HOLDINGS;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseList = parsed;
          }
        } catch {
          // fallback
        }
      }

      await refreshHoldingsData(baseList);
      setLoading(false);
    }
    loadPortfolio();
  }, []);

  const refreshHoldingsData = async (rawHoldings: Array<{ symbol: string; shares: number; avgBuy: number }>) => {
    try {
      const enriched: PortfolioHolding[] = await Promise.all(
        rawHoldings.map(async (item) => {
          try {
            const res = await fetch(`/api/stock?symbol=${encodeURIComponent(item.symbol)}&range=6mo`);
            if (res.ok) {
              const data = await res.json();
              const quote = data.quote;
              const currentPrice = quote.price;
              const investedValue = item.shares * item.avgBuy;
              const currentValue = item.shares * currentPrice;
              const unrealizedPnL = currentValue - investedValue;
              const unrealizedPnLPercent = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;

              return {
                id: item.symbol,
                symbol: item.symbol,
                name: quote.name,
                exchange: quote.exchange,
                shares: item.shares,
                averageBuyPrice: item.avgBuy,
                currentPrice,
                currency: quote.currency,
                sector: quote.sector,
                currentValue: Number(currentValue.toFixed(2)),
                investedValue: Number(investedValue.toFixed(2)),
                unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
                unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
                weightPercent: 0,
                investorScores: data.investorScores,
                technicals: data.technicals
              };
            }
          } catch {
            // fallback
          }

          const fallbackPrice = item.avgBuy * 1.05;
          const invested = item.shares * item.avgBuy;
          const currVal = item.shares * fallbackPrice;
          return {
            id: item.symbol,
            symbol: item.symbol,
            name: item.symbol,
            exchange: 'NSE',
            shares: item.shares,
            averageBuyPrice: item.avgBuy,
            currentPrice: fallbackPrice,
            currency: 'INR',
            sector: 'Diversified',
            currentValue: currVal,
            investedValue: invested,
            unrealizedPnL: currVal - invested,
            unrealizedPnLPercent: 5.0,
            weightPercent: 0
          };
        })
      );

      const totalVal = enriched.reduce((s, h) => s + h.currentValue, 0);
      enriched.forEach(h => {
        h.weightPercent = totalVal > 0 ? Number(((h.currentValue / totalVal) * 100).toFixed(1)) : 0;
      });

      setHoldings(enriched);
      localStorage.setItem(
        'keystock_portfolio',
        JSON.stringify(rawHoldings.map(h => ({ symbol: h.symbol, shares: h.shares, avgBuy: h.avgBuy })))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLoading(true);

    const sharesNum = Number(newShares) || 1;
    const avgBuyNum = Number(newAvgBuy) || 100;

    const existingIndex = holdings.findIndex(h => h.symbol === newSymbol);
    let updatedRaw: Array<{ symbol: string; shares: number; avgBuy: number }> = [];

    if (existingIndex >= 0) {
      updatedRaw = holdings.map(h =>
        h.symbol === newSymbol
          ? { symbol: h.symbol, shares: h.shares + sharesNum, avgBuy: avgBuyNum }
          : { symbol: h.symbol, shares: h.shares, avgBuy: h.averageBuyPrice }
      );
    } else {
      updatedRaw = [
        ...holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgBuy: h.averageBuyPrice })),
        { symbol: newSymbol, shares: sharesNum, avgBuy: avgBuyNum }
      ];
    }

    await refreshHoldingsData(updatedRaw);
    setAddingLoading(false);
    setShowAddModal(false);
  };

  const handleRemoveHolding = async (symbol: string) => {
    const filtered = holdings
      .filter(h => h.symbol !== symbol)
      .map(h => ({ symbol: h.symbol, shares: h.shares, avgBuy: h.averageBuyPrice }));
    await refreshHoldingsData(filtered);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportError(null);
    setImportPreview([]);

    try {
      const fileName = file.name.toLowerCase();
      let parsed: ParsedHoldingItem[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        parsed = await parseExcelHoldings(file);
      } else if (fileName.endsWith('.pdf')) {
        parsed = await parsePdfHoldings(file);
      } else {
        throw new Error('Unsupported format. Please upload .xlsx, .xls, .csv, or .pdf files.');
      }

      if (parsed.length === 0) {
        throw new Error('No valid stock holdings detected in file.');
      }

      setImportPreview(parsed);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);

    const merged = [
      ...holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgBuy: h.averageBuyPrice }))
    ];

    importPreview.forEach(item => {
      const idx = merged.findIndex(m => m.symbol === item.symbol);
      if (idx >= 0) {
        merged[idx].shares += item.shares;
        merged[idx].avgBuy = item.avgBuy;
      } else {
        merged.push({ symbol: item.symbol, shares: item.shares, avgBuy: item.avgBuy });
      }
    });

    await refreshHoldingsData(merged);
    setImportLoading(false);
    setShowImportModal(false);
    setImportPreview([]);
  };

  const downloadSampleExcel = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Symbol,Quantity,Buy Price\nRELIANCE,50,1320\nTCS,25,2450\nINFY,40,1120\nITC,150,465\nHDFCBANK,80,820\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_portfolio_holdings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const analytics = calculatePortfolioAnalytics(holdings);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Portfolio Header & Value Summary */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Portfolio Health &amp; Holdings</h1>
              <p className="text-xs text-slate-500">Live Indian portfolio valuation, 5-gate investor allocation &amp; risk diagnostics</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => refreshHoldingsData(holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgBuy: h.averageBuyPrice })))}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Refresh Quotes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Excel / PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" /> Add Holding
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Portfolio Value</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">₹{analytics.totalCurrentValue.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-0.5">Invested: ₹{analytics.totalInvested.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Unrealized Returns</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${analytics.totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {analytics.totalUnrealizedPnL >= 0 ? '+' : ''}₹{analytics.totalUnrealizedPnL.toLocaleString('en-IN')}
            </div>
            <div className={`text-xs font-mono font-semibold mt-0.5 ${analytics.totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {analytics.totalUnrealizedPnL >= 0 ? '+' : ''}{analytics.totalUnrealizedPnLPercent}% return
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">5-Gate Quality Score</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono mt-1">
              {analytics.weightedCompositeScore} <span className="text-xs text-slate-400 font-normal">/100</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Weighted across Buffett/Druckenmiller</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Risk Assessment</div>
            <div className="text-sm font-bold text-slate-900 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${
                analytics.portfolioRiskSummary.riskGrade === 'LOW RISK / ALL-WEATHER'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : analytics.portfolioRiskSummary.riskGrade === 'BALANCED MODERATE'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {analytics.portfolioRiskSummary.riskGrade}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">{analytics.holdingsCount} active Indian securities</div>
          </div>
        </div>
      </div>

      {/* 5-Gate Investor Exposure & Risk Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Award className="w-4 h-4 text-indigo-600" /> Capital Allocation by Investor Philosophy
            </div>
            <span className="text-xs text-slate-400 font-mono">Weighted by Current Value</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-700 font-medium">Warren Buffett (Durable Moats &gt;15% ROIC)</span>
                <span className="font-mono font-bold text-slate-900">{analytics.investorRegimeExposure.buffettMoatPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${analytics.investorRegimeExposure.buffettMoatPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-700 font-medium">Stanley Druckenmiller (Bullish Trend &gt;50/200 EMA)</span>
                <span className="font-mono font-bold text-slate-900">{analytics.investorRegimeExposure.druckenmillerBullishPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${analytics.investorRegimeExposure.druckenmillerBullishPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-700 font-medium">Michael Burry (Forensic Margin of Safety)</span>
                <span className="font-mono font-bold text-slate-900">{analytics.investorRegimeExposure.burryValuePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${analytics.investorRegimeExposure.burryValuePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-700 font-medium">Cathie Wood (Exponential Growth)</span>
                <span className="font-mono font-bold text-slate-900">{analytics.investorRegimeExposure.woodGrowthPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${analytics.investorRegimeExposure.woodGrowthPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Risk Advisory */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Hedge Fund Risk Advisory
            </div>
            <div className="space-y-2.5">
              {analytics.portfolioRiskSummary.actionableAdvice.map((advice, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{advice}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Sector Allocation</div>
            <div className="flex flex-wrap gap-1.5">
              {analytics.sectorAllocation.map(s => (
                <span key={s.sector} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                  {s.sector}: <strong>{s.percent}%</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Active Holdings ({holdings.length})
          </h2>
          <span className="text-xs text-slate-500">Real-time quotes with Indian market ticks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Qty &amp; Avg Cost</th>
                <th className="px-4 py-3">Current LTP</th>
                <th className="px-4 py-3">Current Value</th>
                <th className="px-4 py-3">Unrealized P&amp;L</th>
                <th className="px-4 py-3">5-Gate Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {holdings.map((h) => {
                const isPositive = h.unrealizedPnL >= 0;
                return (
                  <tr key={h.symbol} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{h.name}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {h.symbol.replace('.NS', '')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.sector} &bull; NSE</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900">{h.weightPercent}%</div>
                      <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-emerald-500 h-full" style={{ width: `${h.weightPercent}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-semibold text-slate-800">{h.shares} shares</div>
                      <div className="text-slate-400 text-[11px]">@ ₹{h.averageBuyPrice}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      ₹{h.currentPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      ₹{h.currentValue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <div className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}₹{h.unrealizedPnL.toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[11px] ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{h.unrealizedPnLPercent}%
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {h.investorScores ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{h.investorScores.compositeScore}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            h.investorScores.unifiedDecision === 'STRONG BUY'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : h.investorScores.unifiedDecision === 'ACCUMULATE'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {h.investorScores.unifiedDecision}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectStock(h.symbol)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => handleRemoveHolding(h.symbol)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove from portfolio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Import Indian Holdings (Excel / PDF)
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload your holding statement from Zerodha, Groww, Upstox, AngelOne, or ICICI Direct. Supports <strong>.xlsx, .xls, .csv, and .pdf</strong>.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-emerald-50/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">Click or drag statement file to upload</div>
              <div className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls, .csv) or Broker Statement (.pdf)</div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span>Need a sample template?</span>
              <button
                onClick={downloadSampleExcel}
                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>

            {importLoading && (
              <div className="p-3 text-center text-xs text-emerald-600 animate-pulse font-medium">
                Parsing holding rows and matching Indian securities...
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {importError}
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Detected {importPreview.length} securities:
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs font-mono">
                  {importPreview.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 flex items-center justify-between text-slate-700">
                      <div>
                        <span className="font-bold text-slate-900">{item.symbol}</span>
                        {item.rawName && <span className="text-[10px] text-slate-400 ml-2">({item.rawName})</span>}
                      </div>
                      <div>
                        {item.shares} shares @ ₹{item.avgBuy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importPreview.length === 0 || importLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40"
              >
                Add {importPreview.length} Holdings to Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Stock to Portfolio</h3>
            <form onSubmit={handleAddHolding} className="space-y-4 text-xs font-medium">
              <div>
                <label className="text-slate-600 block mb-1">Select Indian Stock</label>
                <select
                  value={newSymbol}
                  onChange={(e) => {
                    setNewSymbol(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {STOCK_UNIVERSE.map(s => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol.replace('.NS', '')} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Quantity (Shares)</label>
                <input
                  type="number"
                  min="1"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Average Buy Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={newAvgBuy}
                  onChange={(e) => setNewAvgBuy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                >
                  {addingLoading ? 'Adding...' : 'Save Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
