import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '000001.SS';
  const range = searchParams.get('range') || '1y';
  const interval = searchParams.get('interval') || '1d';
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');

  try {
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}`;
    if (period1 && period2) {
      url += `&period1=${period1}&period2=${period2}`;
    } else {
      url += `&range=${range}`;
    }
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.error(`Yahoo Finance stock API error: ${res.status} ${res.statusText}`);
      return NextResponse.json({ error: `Failed to fetch data: ${res.statusText}` });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Stock API error:`, error);
    return NextResponse.json({ error: 'Failed to fetch data' });
  }
}
