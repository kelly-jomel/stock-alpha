'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PortfolioHolding } from '@/types/portfolio';
import { calculatePortfolioAnalytics } from '@/lib/portfolioAnalytics';
import { STOCK_UNIVERSE } from '@/lib/stockData';
import {
  parseExcelHoldings,
  parsePdfHoldings,
  parseExcelOrderHistory,
  ParsedHoldingItem,
  ParsedTradeOrder
} from '@/lib/fileImportParser';
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
  Download,
  History,
  Layers,
  ArrowDownUp
} from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function PortfolioView({ onSelectStock }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Import mode: 'HOLDINGS' (existing quantity & avg cost) or 'ORDER_HISTORY' (Buy/Sell trades consolidated)
  const [importMode, setImportMode] = useState<'HOLDINGS' | 'ORDER_HISTORY'>('ORDER_HISTORY');

  // New holding form state
  const [newSymbol, setNewSymbol] = useState(STOCK_UNIVERSE[0].symbol);
  const [newShares, setNewShares] = useState('20');
  const [newAvgBuy, setNewAvgBuy] = useState('1000');
  const [addingLoading, setAddingLoading] = useState(false);

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedHoldingItem[]>([]);
  const [orderPreview, setOrderPreview] = useState<ParsedTradeOrder[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Load holdings from localStorage (defaults to empty)
  useEffect(() => {
    async function loadPortfolio() {
      setLoading(true);
      const saved = localStorage.getItem('keystock_portfolio');
      let baseList: Array<{ symbol: string; shares: number; avgBuy: number }> = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
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

    // Auto-refresh portfolio current prices and live P&L every 10 seconds
    const interval = setInterval(() => {
      const saved = localStorage.getItem('keystock_portfolio');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            refreshHoldingsData(parsed);
          }
        } catch {}
      }
    }, 10000);

    return () => clearInterval(interval);
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
              // If API returned live price > 0, use it; otherwise fallback to avgBuy
              const currentPrice = (quote && typeof quote.price === 'number' && quote.price > 0) ? quote.price : item.avgBuy;
              const investedValue = item.shares * item.avgBuy;
              const currentValue = item.shares * currentPrice;
              const unrealizedPnL = currentValue - investedValue;
              const unrealizedPnLPercent = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;

              return {
                id: item.symbol,
                symbol: item.symbol,
                name: quote.name && quote.name !== item.symbol ? quote.name : (item.symbol.replace('.NS', '').replace('.BO', '')),
                exchange: quote.exchange || 'NSE',
                shares: item.shares,
                averageBuyPrice: item.avgBuy,
                currentPrice,
                currency: quote.currency || 'INR',
                sector: quote.sector || 'Diversified',
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
      const existing = holdings[existingIndex];
      // Weighted average calculation when adding to an existing position
      const totalShares = existing.shares + sharesNum;
      const weightedAvgBuy = ((existing.shares * existing.averageBuyPrice) + (sharesNum * avgBuyNum)) / totalShares;

      updatedRaw = holdings.map(h =>
        h.symbol === newSymbol
          ? { symbol: h.symbol, shares: totalShares, avgBuy: Number(weightedAvgBuy.toFixed(2)) }
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
    setOrderPreview([]);

    try {
      const fileName = file.name.toLowerCase();
      let parsed: ParsedHoldingItem[] = [];

      if (importMode === 'ORDER_HISTORY') {
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
          throw new Error('Order history statement must be an Excel (.xlsx, .xls) or CSV file.');
        }
        const { consolidatedHoldings, rawOrders } = await parseExcelOrderHistory(file);
        if (consolidatedHoldings.length === 0 && rawOrders.length === 0) {
          throw new Error('No valid trade orders detected in the order history file. Please verify column headers (Symbol, Type/Side, Quantity, Price).');
        }
        setOrderPreview(rawOrders);
        parsed = consolidatedHoldings;
      } else {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
          parsed = await parseExcelHoldings(file);
        } else if (fileName.endsWith('.pdf')) {
          parsed = await parsePdfHoldings(file);
        } else {
          throw new Error('Unsupported format. Please upload .xlsx, .xls, .csv, or .pdf files.');
        }
      }

      if (parsed.length === 0) {
        throw new Error('No active or open holdings detected from the parsed records.');
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
        // Weighted average cost consolidation with existing holdings
        const totalShares = merged[idx].shares + item.shares;
        const totalCost = (merged[idx].shares * merged[idx].avgBuy) + (item.shares * item.avgBuy);
        merged[idx].shares = totalShares;
        merged[idx].avgBuy = Number((totalCost / totalShares).toFixed(2));
      } else {
        merged.push({ symbol: item.symbol, shares: item.shares, avgBuy: item.avgBuy });
      }
    });

    await refreshHoldingsData(merged);
    setImportLoading(false);
    setShowImportModal(false);
    setImportPreview([]);
    setOrderPreview([]);
  };

  const downloadSampleHoldingsExcel = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Symbol,Quantity,Buy Price\nRELIANCE,50,1320\nTCS,25,2450\nINFY,40,1120\nITC,150,465\nHDFCBANK,80,820\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_holdings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleOrderHistoryExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Trade Date,Symbol,Type,Quantity,Price,Order ID\n' +
      '2026-01-10,RELIANCE,BUY,30,1280.50,ORD1001\n' +
      '2026-01-15,RELIANCE,BUY,20,1310.00,ORD1002\n' +
      '2026-02-01,RELIANCE,SELL,10,1400.00,ORD1003\n' +
      '2026-01-12,TCS,BUY,40,2400.00,ORD1004\n' +
      '2026-02-05,TCS,BUY,10,2500.00,ORD1005\n' +
      '2026-01-20,HDFCBANK,BUY,100,800.00,ORD1006\n' +
      '2026-02-10,HDFCBANK,SELL,20,850.00,ORD1007\n' +
      '2026-02-14,INFY,BUY,50,1125.00,ORD1008\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_order_history.csv');
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
              onClick={() => {
                setImportMode('ORDER_HISTORY');
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs transition-all"
            >
              <History className="w-4 h-4" /> Import Order History
            </button>
            <button
              onClick={() => {
                setImportMode('HOLDINGS');
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Holdings
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
          {holdings.length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem('keystock_portfolio');
                setHoldings([]);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              Clear All Holdings
            </button>
          )}
        </div>

        {holdings.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Your portfolio is currently empty</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Upload your broker order history or holding statement (Excel/PDF) to consolidate and calculate your live valuation, 5-gate investor quality score, and risk parity diagnostics.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setImportMode('ORDER_HISTORY');
                  setShowImportModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs transition-all"
              >
                <History className="w-4 h-4" /> Import &amp; Consolidate Order History
              </button>
              <button
                onClick={() => {
                  setImportMode('HOLDINGS');
                  setShowImportModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" /> Import Holdings Statement
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4 text-right">Shares</th>
                  <th className="py-3 px-4 text-right">Avg Cost</th>
                  <th className="py-3 px-4 text-right">LTP (₹)</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">P&amp;L</th>
                  <th className="py-3 px-4 text-right">Weight</th>
                  <th className="py-3 px-4 text-center">Quality</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {holdings.map((holding) => {
                  const isProfit = holding.unrealizedPnL >= 0;
                  return (
                    <tr
                      key={holding.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => onSelectStock(holding.symbol)}
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {holding.symbol.replace('.NS', '')}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{holding.name}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                        {holding.shares}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{holding.averageBuyPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{holding.currentPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                        ₹{holding.currentValue.toLocaleString('en-IN')}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div>{isProfit ? '+' : ''}₹{holding.unrealizedPnL.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] font-normal">
                          {isProfit ? '+' : ''}{holding.unrealizedPnLPercent}%
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {holding.weightPercent}%
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] border border-indigo-100">
                          {holding.investorScores?.compositeScore ?? '--'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveHolding(holding.symbol)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove holding"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
                {importMode === 'ORDER_HISTORY' ? (
                  <History className="w-5 h-5 text-indigo-600" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                )}
                <span>
                  {importMode === 'ORDER_HISTORY'
                    ? 'Import & Consolidate Order History'
                    : 'Import Holdings Statement'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setOrderPreview([]);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => {
                  setImportMode('ORDER_HISTORY');
                  setImportPreview([]);
                  setOrderPreview([]);
                  setImportError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  importMode === 'ORDER_HISTORY'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                Order History (Buy/Sell Consolidation)
              </button>
              <button
                onClick={() => {
                  setImportMode('HOLDINGS');
                  setImportPreview([]);
                  setOrderPreview([]);
                  setImportError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  importMode === 'HOLDINGS'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Holdings Statement (Quantity + Cost)
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {importMode === 'ORDER_HISTORY' ? (
                <>
                  Upload your completed orders report from <strong>Zerodha (tradebook/orders)</strong>, <strong>Groww</strong>, <strong>Upstox</strong>, or <strong>AngelOne</strong> (.xlsx, .xls, .csv).
                  The app automatically net-balances Buy/Sell orders and calculates true weighted-average purchase prices.
                </>
              ) : (
                <>
                  Upload your existing portfolio holdings statement from your broker (.xlsx, .xls, .csv, or .pdf).
                </>
              )}
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={importMode === 'ORDER_HISTORY' ? '.xlsx,.xls,.csv' : '.xlsx,.xls,.csv,.pdf'}
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload className={`w-8 h-8 mx-auto mb-2 ${importMode === 'ORDER_HISTORY' ? 'text-indigo-600' : 'text-emerald-600'}`} />
              <div className="text-sm font-bold text-slate-800">
                {importMode === 'ORDER_HISTORY' ? 'Click or drag Order History Excel / CSV' : 'Click or drag Holdings file to upload'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {importMode === 'ORDER_HISTORY' ? 'Excel (.xlsx, .xls) or CSV orderbook' : 'Excel (.xlsx, .xls, .csv) or Broker PDF'}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span>Need a sample template?</span>
              <button
                onClick={importMode === 'ORDER_HISTORY' ? downloadSampleOrderHistoryExcel : downloadSampleHoldingsExcel}
                className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download {importMode === 'ORDER_HISTORY' ? 'Order History' : 'Holdings'} CSV
              </button>
            </div>

            {importLoading && (
              <div className="p-3 text-center text-xs text-indigo-600 animate-pulse font-medium">
                {importMode === 'ORDER_HISTORY'
                  ? 'Analyzing trades, netting buy/sell transactions & calculating weighted cost...'
                  : 'Parsing holding rows and matching Indian securities...'}
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {importError}
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Consolidated {importPreview.length} Active Positions:
                  </span>
                  {orderPreview.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      From {orderPreview.length} executed trades
                    </span>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs font-mono">
                  {importPreview.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 flex items-center justify-between text-slate-700">
                      <div>
                        <span className="font-bold text-slate-900">{item.symbol.replace('.NS', '')}</span>
                        {item.tradeCount && (
                          <span className="text-[10px] text-indigo-600 font-sans ml-2 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                            {item.tradeCount} trades
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div>
                          <span className="font-bold text-slate-900">{item.shares}</span> shares @ ₹{item.avgBuy}
                        </div>
                        {item.realizedPnL !== undefined && item.realizedPnL !== 0 && (
                          <div className={`text-[10px] ${item.realizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            Realized P&amp;L: {item.realizedPnL >= 0 ? '+' : ''}₹{item.realizedPnL}
                          </div>
                        )}
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
                  setOrderPreview([]);
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
                Consolidate &amp; Add {importPreview.length} Holdings
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
