import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.error(`Yahoo Finance search API error: ${res.status} ${res.statusText}`);
      return NextResponse.json({ quotes: [], error: `Yahoo API error: ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Search API error:`, error);
    return NextResponse.json({ quotes: [], error: 'Internal server error' });
  }
}
