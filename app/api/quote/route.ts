import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols');
  
  if (!symbols) {
    return NextResponse.json({ error: 'Symbols parameter is required' }, { status: 400 });
  }

  try {
    const symbolsArray = symbols.split(',').map(s => s.trim());
    const results = await yahooFinance.quote(symbolsArray);
    
    return NextResponse.json({
      quoteResponse: {
        result: Array.isArray(results) ? results : [results]
      }
    });
  } catch (error: any) {
    console.error(`Quote API error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quote' }, { status: 500 });
  }
}
