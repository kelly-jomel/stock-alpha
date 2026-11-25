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
  Briefcase
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

  // Recommended buy quantity logic:
  // If not in portfolio: recommend a starter size of ~2% - 3% allocation (e.g. ₹25,000 to ₹50,000 / price)
  // If already in portfolio: recommend accumulation quantity to bring weight to target conviction
  const baseBudget = 40000;
  const currentShares = existingHolding ? existingHolding.shares : 0;
  const stockPrice = selectedStock ? selectedStock.quote.price : 1000;
  const recommendedAddShares = selectedStock
    ? existingHolding
      ? Math.max(5, Math.round((baseBudget * 0.5) / stockPrice))
      : Math.max(10, Math.round(baseBudget / stockPrice))
    : 10;

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
    setAddedSuccess(`Added ${shares} shares of ${symbol} to your portfolio!`);
    setTimeout(() => setAddedSuccess(null), 3500);

    if (onAddToPortfolio) {
      onAddToPortfolio(symbol, shares, price);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> 5-Gate Multi-Investor Consensus
          </div>
          <h1 className="text-xl font-bold text-slate-900">Stock Recommendations &amp; Analysis</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Every stock is evaluated across Buffett, Druckenmiller, Dalio, Burry, and Wood mental models. Click any security on the left to inspect its deep-dive report and customized portfolio buy sizing.
          </p>
        </div>

        {data?.marketStatus && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-right">
            <div className="text-[11px] text-slate-500 font-medium">Market Regime</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{data.marketStatus.regime}</div>
            <div className="text-xs font-mono font-semibold text-emerald-600">NIFTY: ₹{data.marketStatus.benchmarkPrice.toLocaleString('en-IN')}</div>
          </div>
        )}
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
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2 h-[680px] flex flex-col">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
            Top Ranked Securities ({data?.topBuys.length || 0})
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
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rec.quote.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{rec.quote.name}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {rec.quote.symbol.replace('.NS', '')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>NSE</span>
                            <span>&bull;</span>
                            <span>{rec.quote.sector}</span>
                            {inPortfolio && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 text-[10px] font-semibold">
                                In Portfolio
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          ₹{rec.quote.price.toLocaleString('en-IN')}
                        </div>
                        <div className={`text-xs font-semibold font-mono ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPos ? '+' : ''}{rec.quote.changePercent}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.convictionTier.includes('TIER 1')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.convictionTier.split(':')[0]}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Score: <strong className="text-slate-800">{rec.investorScores.compositeScore}/100</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Stock Deep-Dive Analysis & Buy Sizing (7 cols) */}
        <div className="lg:col-span-7">
          {selectedStock ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Top Details & Action */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-lg text-emerald-600">
                    {selectedStock.quote.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{selectedStock.quote.name}</h2>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedStock.quote.symbol.replace('.NS', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono text-slate-600 font-semibold">{selectedStock.quote.symbol}</span>
                      <span>&bull;</span>
                      <span>{selectedStock.quote.sector}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-600 font-semibold">{selectedStock.convictionTier}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectStock(selectedStock.quote.symbol)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                  >
                    View Chart <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Price & Target Execution Levels */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Current Price</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">₹{selectedStock.quote.price}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Suggested Entry</div>
                  <div className="text-base font-bold text-indigo-600 mt-0.5">₹{selectedStock.suggestedEntry}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Stop Loss Floor</div>
                  <div className="text-base font-bold text-rose-600 mt-0.5">₹{selectedStock.stopLossPrice}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Target (R:R {selectedStock.riskRewardRatio})</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">₹{selectedStock.targetPrice}</div>
                </div>
              </div>

              {/* Portfolio Position Context & Recommended Buy Quantity Box */}
              <div className="bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-indigo-50/40 rounded-xl border border-emerald-200/80 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    Portfolio Allocation &amp; Recommended Order Quantity
                  </div>
                  {existingHolding ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Already in Portfolio ({existingHolding.shares} shares @ ₹{existingHolding.avgBuy})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      New Addition Setup
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-600">
                      {existingHolding
                        ? 'Recommended accumulation to optimize risk-adjusted weight without violating concentration limits:'
                        : 'Recommended starter position based on a balanced 2.5% portfolio risk allocation:'}
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {recommendedAddShares} Shares <span className="text-xs font-normal text-slate-500 font-sans">(Approx. ₹{(recommendedAddShares * selectedStock.quote.price).toLocaleString('en-IN')})</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAdd(selectedStock.quote.symbol, recommendedAddShares, selectedStock.quote.price)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" /> Add {recommendedAddShares} to Portfolio
                  </button>
                </div>
              </div>

              {/* 5 Legendary Investor Scorecard */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  5-Gate Investor Synthesis Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Buffett Moat
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                      {selectedStock.investorScores.buffett.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">ROIC: {selectedStock.quote.roic}%</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Druckenmiller Trend
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                      {selectedStock.investorScores.druckenmiller.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">&gt;50 &amp; 200 EMA</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" /> Burry Margin
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                      {selectedStock.investorScores.burry.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">P/E: {selectedStock.quote.peRatio}x</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" /> Dalio All-Weather
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                      {selectedStock.investorScores.dalio.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Altman Z: {selectedStock.quote.altmanZScore}</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Wood Innovation
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                      {selectedStock.investorScores.wood.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Growth Tailwinds</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Composite Alpha
                    </div>
                    <div className="text-lg font-bold text-indigo-600 font-mono mt-1">
                      {selectedStock.investorScores.compositeScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{selectedStock.investorScores.unifiedDecision}</div>
                  </div>
                </div>
              </div>

              {/* Core Qualitative Catalysts */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Detailed Thesis &amp; Catalysts
                </h3>
                <div className="space-y-2">
                  {selectedStock.catalystReasons.map((reason, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              Select any security from the left to view detailed analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
