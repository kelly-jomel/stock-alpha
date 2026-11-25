import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE, fetchStockQuote } from '@/lib/stockData';

export async function GET() {
  try {
    const quotes = await Promise.all(
      STOCK_UNIVERSE.filter(s => s.symbol !== '^NSEI').map(s => fetchStockQuote(s.symbol))
    );

    // Top Gainers (highest positive changePercent)
    const topGainers = [...quotes]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    // Top Losers (lowest changePercent)
    const topLosers = [...quotes]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    // Most Bought / Most Active on Stock Alpha (high volume & market cap)
    const mostBought = [...quotes]
      .sort((a, b) => (b.volume * b.price) - (a.volume * a.price))
      .slice(0, 5);

    // 52-Week High / Near Highs
    const fiftyTwoWeekHighs = [...quotes]
      .filter(q => q.changePercent > 0.5)
      .slice(0, 4);

    // Sector breakdown
    const sectors = [
      { name: 'Banking & Financials', count: 4, icon: 'Landmark', change: '+1.4%' },
      { name: 'Information Technology', count: 2, icon: 'Cpu', change: '+2.1%' },
      { name: 'Energy & Oil', count: 1, icon: 'Zap', change: '+0.6%' },
      { name: 'Automobile & EV', count: 1, icon: 'Car', change: '+1.8%' },
      { name: 'Consumer Goods', count: 2, icon: 'ShoppingBag', change: '+0.9%' },
      { name: 'Healthcare & Pharma', count: 1, icon: 'HeartPulse', change: '+1.1%' }
    ];

    // Market indices overview (Nifty 50, Sensex preview, Nifty Bank, Nifty IT)
    const indices = [
      { name: 'NIFTY 50', symbol: '^NSEI', price: 25774.1, change: '+545.2', changePercent: '+2.16%', isPositive: true },
      { name: 'SENSEX', symbol: 'BSE', price: 84520.4, change: '+1640.8', changePercent: '+1.98%', isPositive: true },
      { name: 'BANK NIFTY', symbol: 'BANK', price: 53840.0, change: '+890.3', changePercent: '+1.68%', isPositive: true },
      { name: 'NIFTY IT', symbol: 'IT', price: 42150.2, change: '+1120.5', changePercent: '+2.73%', isPositive: true }
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
