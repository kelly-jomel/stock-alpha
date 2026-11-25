'use client';

import React from 'react';
import {
  TrendingUp,
  PieChart,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  BarChart3,
  Search,
  CheckCircle2,
  ChevronRight,
  Layers,
  Lock,
  Globe,
  DollarSign
} from 'lucide-react';

interface Props {
  onSignInClick: () => void;
  onExploreDemo: () => void;
}

export default function LandingPageView({ onSignInClick, onExploreDemo }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-xs">
              <span className="font-black text-white text-base">α</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Stock Alpha</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                  NSE/BSE
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#portfolio-analysis" className="hover:text-slate-900 transition-colors">Portfolio Health</a>
            <a href="#groww-preview" className="hover:text-slate-900 transition-colors">Groww Integration</a>
            <a href="#security" className="hover:text-slate-900 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Live Demo
            </button>
            <button
              onClick={onSignInClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-tr from-emerald-100/60 via-teal-100/40 to-indigo-100/30 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Next-Generation Indian Stock Analysis Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Smarter Stock Analysis & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600">
              Institutional Portfolio Health
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Gain clarity on your Indian equity investments. Get algorithmic <strong>BUY / SELL / HOLD</strong> signals,
            deep sector allocation diagnostics, real-time NSE/BSE updates, and upcoming seamless Groww integration.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSignInClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Get Started with Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
            >
              <span>Explore Live Market Feed</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Free for Retail Investors
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> We Are an Analysis App, Not a Broker
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero Order Execution Risk
            </span>
          </div>
        </div>

        {/* Product Visual Mockup Card */}
        <div className="max-w-5xl mx-auto mt-14 bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 font-mono ml-2">Stock Alpha / Portfolio Diagnostics</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              ● Live NSE Session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sector Donut Preview */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-8 border-emerald-500 border-t-teal-400 border-r-indigo-500 border-b-amber-400 flex items-center justify-center my-2">
                <span className="text-xs font-bold text-slate-700">100%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 mt-2">Groww-Style Donut Allocation</h4>
              <p className="text-[11px] text-slate-500 mt-1">Automatic multi-sector risk balance across Banking, IT, Energy & Auto.</p>
            </div>

            {/* Diagnostics Preview */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Health Diagnostics</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">GRADE A</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                <div className="flex justify-between"><span>Concentration Risk:</span><strong className="text-emerald-600 font-bold">Optimal</strong></div>
                <div className="flex justify-between"><span>Earnings Moat:</span><strong className="text-teal-600 font-bold">High Quality</strong></div>
                <div className="flex justify-between"><span>Growth Drivers:</span><strong className="text-indigo-600 font-bold">Large Cap Heavy</strong></div>
              </div>
            </div>

            {/* Actionable Signals Preview */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5">
              <span className="text-xs font-bold text-slate-700">Algorithmic Signals</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-800">RELIANCE</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">BUY</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-800">TCS</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">HOLD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 px-6 bg-white border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for Serious Indian Equity Investors
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Clear, uncluttered metrics designed to protect your capital and find alpha in the Indian stock market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/70 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Groww-Inspired Sector Allocation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive SVG donut charts displaying your portfolio breakdown with rupee value and percentage share.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/70 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Buy / Sell / Hold Decision Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clear algorithmic indicators factoring in 20/50 EMA momentum, RSI levels, and fundamental moat.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/70 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Instant Tradebook Import</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Import Excel and CSV order histories from Groww, Zerodha, Upstox, and AngelOne in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Groww Integration Preview Banner */}
      <section id="groww-preview" className="py-16 px-6 bg-emerald-50/50">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-full text-emerald-100">
              Groww Integration
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Direct Groww Sync Coming Soon
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Connect via your Groww Trading API token or drop your Groww Holdings Excel file to analyze your portfolio instantly without manual data entry.
            </p>
          </div>
          <button
            onClick={onSignInClick}
            className="px-6 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
          >
            Sign In to Unlock
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 bg-white border-t border-slate-200 text-center text-xs text-slate-400 space-y-2">
        <p>© 2026 Stock Alpha. Non-broker educational stock market analysis and portfolio diagnostics platform.</p>
        <p className="text-[11px] text-slate-400">All Indian market quotes and data for educational & analytical purposes.</p>
      </footer>
    </div>
  );
}
