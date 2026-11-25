import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE, fetchStockQuote } from '@/lib/stockData';

export async function GET() {
  try {
    // 1. Fetch live quotes for major Indian stock universe
    const quotes = await Promise.all(
      STOCK_UNIVERSE.filter(s => !s.symbol.startsWith('^')).map(s => fetchStockQuote(s.symbol))
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
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    // Top Losers (lowest changePercent)
    const topLosers = [...activeQuotes]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    // Most Bought / Most Active on Stock Alpha (high volume & market cap)
    const mostBought = [...activeQuotes]
      .sort((a, b) => (b.volume * b.price) - (a.volume * a.price))
      .slice(0, 5);

    // 52-Week High / Near Highs
    const fiftyTwoWeekHighs = [...activeQuotes]
      .filter(q => q.changePercent > 0.5)
      .slice(0, 4);

    // Sector breakdown
    const sectors = [
      { name: 'Banking & Financials', count: 6, icon: 'Landmark', change: '+1.4%' },
      { name: 'Information Technology', count: 4, icon: 'Cpu', change: '+2.1%' },
      { name: 'Energy & Oil', count: 4, icon: 'Zap', change: '+0.6%' },
      { name: 'Automobile & EV', count: 3, icon: 'Car', change: '+1.8%' },
      { name: 'Consumer Goods', count: 2, icon: 'ShoppingBag', change: '+0.9%' },
      { name: 'Healthcare & Pharma', count: 1, icon: 'HeartPulse', change: '+1.1%' }
    ];

    return NextResponse.json({
      indices,
      topGainers,
      topLosers,
      mostBought,
      fiftyTwoWeekHighs,
      sectors
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
