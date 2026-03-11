import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const result = await yahooFinance.search(q, { quotesCount: 10, newsCount: 0 });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Search API error:`, error);
    return NextResponse.json({ quotes: [], error: error.message || 'Internal server error' });
  }
}
