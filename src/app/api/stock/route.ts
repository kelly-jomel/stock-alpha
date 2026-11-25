import { NextResponse } from 'next/server';
import { fetchStockQuote, fetchStockCandles } from '@/lib/stockData';
import { detectTechnicalIndicators } from '@/lib/indicators';
import { evaluateInvestorModels } from '@/lib/investorModels';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE.NS';
  const range = searchParams.get('range') || '1y';
  const interval = searchParams.get('interval') || '1d';

  try {
    const [quote, candles] = await Promise.all([
      fetchStockQuote(symbol),
      fetchStockCandles(symbol, range, interval)
    ]);

    const technicals = detectTechnicalIndicators(candles);
    const investorScores = evaluateInvestorModels(quote, technicals);

    return NextResponse.json({
      quote,
      technicals,
      investorScores,
      candles
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
