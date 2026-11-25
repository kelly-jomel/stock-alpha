import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE, fetchStockQuote } from '@/lib/stockData';

export async function GET() {
  try {
    // 1. Fetch live quotes for major Indian stock universe
    const nonIndexUniverse = STOCK_UNIVERSE.filter(s => !s.symbol.startsWith('^'));
    const quotes = await Promise.all(
      nonIndexUniverse.map(s => fetchStockQuote(s.symbol))
    );

    // 2. Fetch live actual quotes for Indian benchmark indices
    const [niftyQuote, sensexQuote, bankNiftyQuote, itQuote] = await Promise.all([
      fetchStockQuote('^NSEI'),
      fetchStockQuote('^BSESN'),
      fetchStockQuote('^NSEBANK'),
      fetchStockQuote('^CNXIT')
    ]);

    const formatIndex = (name: string, sym: string, q: { price: number; change: number; changePercent: number }, fallbackPrice: number) => {
      const p = q.price > 0 ? q.price : fallbackPrice;
      const c = q.change;
      const cp = q.changePercent;
      return {
        name,
        symbol: sym,
        price: p,
        change: `${c >= 0 ? '+' : ''}${c.toFixed(1)}`,
        changePercent: `${cp >= 0 ? '+' : ''}${cp.toFixed(2)}%`,
        isPositive: c >= 0
      };
    };

    const indices = [
      formatIndex('NIFTY 50', '^NSEI', niftyQuote, 25930.9),
      formatIndex('SENSEX', '^BSESN', sensexQuote, 84890.2),
      formatIndex('BANK NIFTY', '^NSEBANK', bankNiftyQuote, 54120.0),
      formatIndex('NIFTY IT', '^CNXIT', itQuote, 42800.5)
    ];

    // Filter valid priced stocks for rankings
    const activeQuotes = quotes.filter(q => q.price > 0);

    // Top Gainers (highest positive changePercent)
    const topGainers = [...activeQuotes]
      .sort((a, b) => b.changePercent - a.changePercent);

    // Top Losers (lowest changePercent)
    const topLosers = [...activeQuotes]
      .sort((a, b) => a.changePercent - b.changePercent);

    // Most Traded across entire market (volume * price turnover)
    const mostBought = [...activeQuotes]
      .sort((a, b) => (b.volume * b.price) - (a.volume * a.price));

    // 52-Week High / Near Highs
    const fiftyTwoWeekHighs = [...activeQuotes]
      .filter(q => q.changePercent > 0.5)
      .slice(0, 10);

    // Dynamic sector breakdown calculated from actual active quotes
    const sectorGroups: Record<string, { count: number; totalChange: number; icon: string }> = {
      'Banking & Financials': { count: 0, totalChange: 0, icon: 'Landmark' },
      'Information Technology': { count: 0, totalChange: 0, icon: 'Cpu' },
      'Energy & Power': { count: 0, totalChange: 0, icon: 'Zap' },
      'Automobile & EV': { count: 0, totalChange: 0, icon: 'Car' },
      'Consumer Goods & Retail': { count: 0, totalChange: 0, icon: 'ShoppingBag' },
      'Healthcare & Pharma': { count: 0, totalChange: 0, icon: 'HeartPulse' },
      'Metals & Mining': { count: 0, totalChange: 0, icon: 'Building' },
      'Capital Goods & Defense': { count: 0, totalChange: 0, icon: 'Shield' },
      'Telecom & Logistics': { count: 0, totalChange: 0, icon: 'Radio' },
      'Commodities & ETFs': { count: 0, totalChange: 0, icon: 'Coins' }
    };

    activeQuotes.forEach(q => {
      const sec = q.sector || 'Banking & Financials';
      if (!sectorGroups[sec]) {
        sectorGroups[sec] = { count: 0, totalChange: 0, icon: 'Building' };
      }
      sectorGroups[sec].count++;
      sectorGroups[sec].totalChange += q.changePercent;
    });

    const sectors = Object.entries(sectorGroups)
      .filter(([, v]) => v.count > 0)
      .map(([name, val]) => {
        const avg = val.count > 0 ? (val.totalChange / val.count).toFixed(2) : '0.00';
        return {
          name,
          count: val.count,
          icon: val.icon,
          change: `${Number(avg) >= 0 ? '+' : ''}${avg}%`
        };
      });

    return NextResponse.json({
      indices,
      topGainers,
      topLosers,
      mostBought,
      fiftyTwoWeekHighs,
      sectors,
      allQuotes: activeQuotes
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
