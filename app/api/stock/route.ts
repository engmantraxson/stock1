import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

function getPeriod1FromRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1d': return new Date(now.setDate(now.getDate() - 1));
    case '5d': return new Date(now.setDate(now.getDate() - 5));
    case '1mo': return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo': return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo': return new Date(now.setMonth(now.getMonth() - 6));
    case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
    case '2y': return new Date(now.setFullYear(now.getFullYear() - 2));
    case '5y': return new Date(now.setFullYear(now.getFullYear() - 5));
    case '10y': return new Date(now.setFullYear(now.getFullYear() - 10));
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    case 'max': return new Date('1970-01-01');
    default: return new Date(now.setFullYear(now.getFullYear() - 1));
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '000001.SS';
  const range = searchParams.get('range') || '1y';
  const interval = searchParams.get('interval') || '1d';
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');

  try {
    const queryOptions: any = {
      interval: interval as any,
      return: 'object'
    };

    if (period1 && period2) {
      queryOptions.period1 = new Date(parseInt(period1) * 1000);
      queryOptions.period2 = new Date(parseInt(period2) * 1000);
    } else {
      queryOptions.period1 = getPeriod1FromRange(range);
    }

    const result = await yahooFinance.chart(symbol, queryOptions);
    
    return NextResponse.json({
      chart: {
        result: [result]
      }
    });
  } catch (error: any) {
    console.error(`Stock API error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' });
  }
}
