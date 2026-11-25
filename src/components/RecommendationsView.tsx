'use client';

import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketRegimeStatus } from '@/app/api/market-analysis/route';
import { PortfolioHolding } from '@/types/portfolio';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Search,
  Compass,
  Zap,
  Award,
  PlusCircle,
  Briefcase,
  IndianRupee,
  Layers,
  Calculator
} from 'lucide-react';

interface Props {
  onSelectStock: (symbol: string) => void;
  onAddToPortfolio?: (symbol: string, shares: number, price: number) => void;
}

export default function RecommendationsView({ onSelectStock, onAddToPortfolio }: Props) {
  const [data, setData] = useState<{
    marketStatus: MarketRegimeStatus;
    topBuys: StockRecommendation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [portfolioHoldings, setPortfolioHoldings] = useState<Array<{ symbol: string; shares: number; avgBuy: number }>>([]);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);

  // User-defined total investment budget (defaults to ₹1,00,000)
  const [investmentBudget, setInvestmentBudget] = useState<number>(100000);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/market-analysis');
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.topBuys?.length > 0) {
            setSelectedStock(json.topBuys[0]);
          }
        }

        // Read portfolio from localStorage to calculate recommended rebalance quantity
        const saved = localStorage.getItem('keystock_portfolio');
        if (saved) {
          setPortfolioHoldings(JSON.parse(saved));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate portfolio context for selected stock
  const existingHolding = portfolioHoldings.find(h => h.symbol === selectedStock?.quote.symbol);

  // Portfolio-aware sizing logic:
  // Target position sizing depends on conviction tier and custom investment budget:
  // Tier 1 High Conviction: ~15% - 20% target allocation
  // Tier 2 Momentum Breakout: ~10% target allocation
  // Tier 3 Compound Moat: ~8% target allocation
  const getTargetAllocationPercent = (rec: StockRecommendation | null) => {
    if (!rec) return 10;
    if (rec.convictionTier.includes('TIER 1')) return 18;
    if (rec.convictionTier.includes('TIER 2')) return 12;
    return 8;
  };

  const targetAllocPercent = getTargetAllocationPercent(selectedStock);
  const targetStockBudget = (investmentBudget * targetAllocPercent) / 100;
  const stockPrice = selectedStock?.quote.price && selectedStock.quote.price > 0 ? selectedStock.quote.price : 1000;
  
  // Existing position value
  const existingShares = existingHolding ? existingHolding.shares : 0;
  const existingValue = existingShares * stockPrice;
  const remainingBudgetForStock = Math.max(0, targetStockBudget - existingValue);

  // If already at or above target weight, recommend a trim/hold or small accumulation tranche (1-2 shares or 10%)
  const recommendedShares = selectedStock
    ? existingHolding
      ? remainingBudgetForStock > stockPrice
        ? Math.max(1, Math.round(remainingBudgetForStock / stockPrice))
        : Math.max(1, Math.round((targetStockBudget * 0.15) / stockPrice))
      : Math.max(1, Math.round(targetStockBudget / stockPrice))
    : 1;

  const totalRecommendedCost = Number((recommendedShares * stockPrice).toFixed(2));

  const handleQuickAdd = (symbol: string, shares: number, price: number) => {
    const saved = localStorage.getItem('keystock_portfolio');
    let list: Array<{ symbol: string; shares: number; avgBuy: number }> = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex(h => h.symbol === symbol);

    if (idx >= 0) {
      list[idx].shares += shares;
    } else {
      list.push({ symbol, shares, avgBuy: price });
    }

    localStorage.setItem('keystock_portfolio', JSON.stringify(list));
    setPortfolioHoldings(list);
    setAddedSuccess(`Added ${shares} shares of ${symbol.replace('.NS', '')} to your portfolio!`);
    setTimeout(() => setAddedSuccess(null), 3500);

    if (onAddToPortfolio) {
      onAddToPortfolio(symbol, shares, price);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner & Investment Budget Controller */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> 5-Gate Multi-Investor Consensus
          </div>
          <h1 className="text-xl font-bold text-slate-900">Stock Recommendations &amp; Portfolio Allocation</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Every stock is evaluated across Buffett, Druckenmiller, Dalio, Burry, and Wood models. Sizing recommendations dynamically factor in your available capital and current portfolio exposure.
          </p>
        </div>

        {/* Investment Budget Selector */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2 min-w-[260px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Investment Capital:
            </span>
            <span className="font-bold text-slate-900 font-mono">
              ₹{investmentBudget.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[25000, 50000, 100000, 250000, 500000].map(amt => (
              <button
                key={amt}
                onClick={() => setInvestmentBudget(amt)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  investmentBudget === amt
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}
              </button>
            ))}
          </div>

          <div className="relative mt-1">
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
            <input
              type="number"
              step="5000"
              min="5000"
              value={investmentBudget}
              onChange={(e) => setInvestmentBudget(Math.max(1000, Number(e.target.value) || 0))}
              className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              placeholder="Custom capital amount"
            />
          </div>
        </div>
      </div>

      {addedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{addedSuccess}</span>
        </div>
      )}

      {/* Main 2-Column Layout: Left List, Right Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stocks List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2 h-[720px] flex flex-col">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
            Top Ranked Opportunities ({data?.topBuys.length || 0})
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                Running 5-gate multi-factor scoring...
              </div>
            ) : (
              data?.topBuys.map((rec) => {
                const isSelected = selectedStock?.quote.symbol === rec.quote.symbol;
                const isPos = rec.quote.change >= 0;
                const inPortfolio = portfolioHoldings.some(h => h.symbol === rec.quote.symbol);

                return (
                  <div
                    key={rec.quote.symbol}
                    onClick={() => setSelectedStock(rec)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {rec.quote.symbol.replace('.NS', '').replace('.BO', '')}
                        </span>
                        {inPortfolio && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                            <Briefcase className="w-2.5 h-2.5" /> In Portfolio
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[170px]">
                        {rec.quote.name}
                      </div>
                      <div className="text-[11px] font-bold text-indigo-600">
                        {rec.convictionTier}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        ₹{rec.quote.price.toLocaleString('en-IN')}
                      </div>
                      <div className={`text-xs font-semibold font-mono ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPos ? '+' : ''}{rec.quote.changePercent}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 font-semibold">
                        Score: <span className="text-emerald-600">{rec.investorScores.compositeScore}/100</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep-Dive Analysis & Recommended Buy Sizing (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedStock ? (
            <>
              {/* Selected Stock Overview Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{selectedStock.quote.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold">
                        {selectedStock.quote.symbol.replace('.NS', '')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        {selectedStock.quote.sector}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Target Conviction: <strong className="text-indigo-600">{selectedStock.convictionTier}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      ₹{selectedStock.quote.price.toLocaleString('en-IN')}
                    </div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${selectedStock.quote.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedStock.quote.change >= 0 ? '+' : ''}{selectedStock.quote.change} ({selectedStock.quote.changePercent}%)
                    </div>
                  </div>
                </div>

                {/* Sizing & Portfolio Allocation Card */}
                <div className="p-4 rounded-xl bg-gradient-to-tr from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      Dynamic Buy Sizing &amp; Portfolio Recommendation
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold">
                      {existingHolding ? 'Rebalancing / Accumulating' : 'New Position Sizing'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500">Target Weight</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{targetAllocPercent}%</div>
                      <div className="text-[10px] text-slate-400">of ₹{(investmentBudget / 1000).toFixed(0)}k budget</div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500">Currently Held</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{existingShares} shares</div>
                      <div className="text-[10px] text-slate-400">₹{(existingValue).toLocaleString('en-IN')}</div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-bold">Recommended Buy</div>
                      <div className="font-bold text-emerald-600 text-base mt-0.5">{recommendedShares} shares</div>
                      <div className="text-[10px] text-slate-500">₹{totalRecommendedCost.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500">Action Plan</div>
                      <div className="font-bold text-indigo-600 text-xs mt-0.5 truncate">
                        {existingHolding ? 'Accumulate Tranche' : 'Initiate Allocation'}
                      </div>
                      <div className="text-[10px] text-slate-400">Risk-Adjusted</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-600">
                      {existingHolding ? (
                        <>You currently own <strong>{existingShares} shares</strong>. Adding <strong>{recommendedShares} shares</strong> brings your holding to its optimal conviction target.</>
                      ) : (
                        <>Recommended starter tranche of <strong>{recommendedShares} shares</strong> (~{targetAllocPercent}% of ₹{investmentBudget.toLocaleString('en-IN')}).</>
                      )}
                    </div>
                    <button
                      onClick={() => handleQuickAdd(selectedStock.quote.symbol, recommendedShares, selectedStock.quote.price)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 ml-3"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add {recommendedShares} Shares to Portfolio
                    </button>
                  </div>
                </div>

                {/* Unified Thesis & Price Targets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Suggested Entry</div>
                    <div className="text-emerald-600 font-bold text-sm mt-0.5">₹{selectedStock.suggestedEntry}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Disciplined Stop-Loss</div>
                    <div className="text-rose-600 font-bold text-sm mt-0.5">₹{selectedStock.stopLossPrice}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Target Objective</div>
                    <div className="text-indigo-600 font-bold text-sm mt-0.5">₹{selectedStock.targetPrice}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Investment Catalysts &amp; Asymmetric Setup
                  </h3>
                  <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                    {selectedStock.catalystReasons?.map((reason, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Gate Scorecard */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    5-Gate Legend Consensus Evaluation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/40">
                      <div className="font-bold text-amber-800 flex items-center justify-between">
                        <span>Warren Buffett Moat</span>
                        <span className="font-mono">{selectedStock.investorScores.buffett.score}/100</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{selectedStock.investorScores.buffett.verdict}</div>
                    </div>

                    <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40">
                      <div className="font-bold text-emerald-800 flex items-center justify-between">
                        <span>Stanley Druckenmiller Trend</span>
                        <span className="font-mono">{selectedStock.investorScores.druckenmiller.score}/100</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{selectedStock.investorScores.druckenmiller.verdict}</div>
                    </div>

                    <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/40">
                      <div className="font-bold text-blue-800 flex items-center justify-between">
                        <span>Ray Dalio Credit &amp; Deleveraging</span>
                        <span className="font-mono">{selectedStock.investorScores.dalio.score}/100</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{selectedStock.investorScores.dalio.verdict}</div>
                    </div>

                    <div className="p-2.5 rounded-lg border border-rose-100 bg-rose-50/40">
                      <div className="font-bold text-rose-800 flex items-center justify-between">
                        <span>Michael Burry Margin of Safety</span>
                        <span className="font-mono">{selectedStock.investorScores.burry.score}/100</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{selectedStock.investorScores.burry.verdict}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => onSelectStock(selectedStock.quote.symbol)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Open Live Interactive Terminal &amp; Chart <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
              Select a stock from the left column to view in-depth 5-gate analysis and custom quantity sizing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
