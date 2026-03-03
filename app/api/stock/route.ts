import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '000001.SS';
  const range = searchParams.get('range') || '1y';
  const interval = searchParams.get('interval') || '1d';
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');

  try {
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}`;
    if (period1 && period2) {
      url += `&period1=${period1}&period2=${period2}`;
    } else {
      url += `&range=${range}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
