import { NextResponse } from 'next/server';
import { STOCK_UNIVERSE } from '@/lib/stockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const queryLower = q.toLowerCase();

  // 1. First check verified local Indian universe
  const localMatches = STOCK_UNIVERSE.filter(s =>
    s.symbol.toLowerCase().includes(queryLower) ||
    s.name.toLowerCase().includes(queryLower)
  ).map(s => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    exchange: s.exchange
  }));

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      next: { revalidate: 30 }
    });

    if (res.ok) {
      const data = await res.json();
      const rawQuotes = data.quotes || [];

      // Accept Indian symbols (.NS, .BO, exchange NSI or BSE)
      const remoteMatches = rawQuotes
        .filter((item: { symbol?: string; exchange?: string }) => {
          const sym = item.symbol || '';
          const ex = item.exchange || '';
          return sym.endsWith('.NS') || sym.endsWith('.BO') || ex === 'NSI' || ex === 'BSE';
        })
        .map((item: { symbol: string; shortname?: string; longname?: string; sector?: string }) => ({
          symbol: item.symbol,
          name: item.shortname || item.longname || item.symbol.replace('.NS', ''),
          sector: item.sector || 'Equity',
          exchange: (item.symbol.endsWith('.BO') ? 'BSE' : 'NSE') as 'NSE' | 'BSE'
        }));

      // Merge and deduplicate by symbol
      const combined = [...localMatches];
      remoteMatches.forEach((m: { symbol: string; name: string; sector: string; exchange: 'NSE' | 'BSE' }) => {
        if (!combined.some(c => c.symbol === m.symbol)) {
          combined.push(m);
        }
      });

      return NextResponse.json({ results: combined });
    }
  } catch (err) {
    console.error('Search API error:', err);
  }

  return NextResponse.json({ results: localMatches });
}
