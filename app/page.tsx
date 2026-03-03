'use client';

import React, { useEffect, useState } from 'react';
import StockChart from '@/components/StockChart';
import { ChartData } from '@/lib/indicators';
import { format } from 'date-fns';
import { Activity, TrendingUp, TrendingDown, Clock, BarChart2 } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainIndicator, setMainIndicator] = useState('MA');
  const [selectedSubIndicators, setSelectedSubIndicators] = useState<string[]>(['VOL', 'NONE', 'NONE', 'NONE', 'NONE']);
  const [timeframe, setTimeframe] = useState('1y');
  const [interval, setInterval] = useState('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return; // Don't fetch until both dates are selected
      }

      setLoading(true);
      setError(null);
      try {
        let url = `/api/stock?symbol=000001.SS&interval=${interval}`;
        if (timeframe === 'custom') {
          const p1 = Math.floor(new Date(startDate).getTime() / 1000);
          const p2 = Math.floor(new Date(endDate).getTime() / 1000) + 86399; // end of day
          url += `&period1=${p1}&period2=${p2}`;
        } else {
          url += `&range=${timeframe}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch data');
        const json = await res.json();
        
        const result = json.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        const isValidNumber = (val: any) => val !== null && val !== undefined && !Number.isNaN(val) && Number.isFinite(val);
        
        const chartData: ChartData[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (isValidNumber(timestamps[i]) && isValidNumber(quotes.open[i]) && isValidNumber(quotes.high[i]) && isValidNumber(quotes.low[i]) && isValidNumber(quotes.close[i])) {
            // Use full date-time format for intraday intervals
            // lightweight-charts expects a unix timestamp (in seconds) for intraday data
            const isIntraday = ['1m', '2m', '5m', '15m', '30m', '60m', '1h'].includes(interval);
            
            chartData.push({
              time: isIntraday ? timestamps[i] : format(new Date(timestamps[i] * 1000), 'yyyy-MM-dd'),
              open: quotes.open[i],
              high: quotes.high[i],
              low: quotes.low[i],
              close: quotes.close[i],
              volume: quotes.volume[i] || 0,
            });
          }
        }
        
        // Sort by time just in case
        chartData.sort((a, b) => {
          const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
          const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
          return timeA - timeB;
        });
        
        // Remove duplicates
        const uniqueData = chartData.filter((v, i, a) => a.findIndex(t => (t.time === v.time)) === i);
        
        setData(uniqueData);

        if (uniqueData.length > 0) {
          const last = uniqueData[uniqueData.length - 1];
          const prev = uniqueData[uniqueData.length - 2] || last;
          const change = last.close - prev.close;
          const changePercent = (change / prev.close) * 100;
          
          setQuote({
            price: last.close,
            change,
            changePercent,
            open: last.open,
            high: last.high,
            low: last.low,
            volume: last.volume,
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeframe, interval, startDate, endDate]);

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    // Adjust timeframe if necessary based on Yahoo Finance limits
    if (['1m', '2m', '5m', '15m', '30m'].includes(newInterval)) {
      if (!['1d', '5d', '1mo'].includes(timeframe)) {
        setTimeframe('5d');
      }
    } else if (['60m', '1h'].includes(newInterval)) {
      if (!['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y'].includes(timeframe)) {
        setTimeframe('1mo');
      }
    }
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    // Adjust interval if necessary based on Yahoo Finance limits
    if (['2y', '5y', '10y', 'max'].includes(newTimeframe) && ['1m', '2m', '5m', '15m', '30m', '60m', '1h'].includes(interval)) {
      setInterval('1d');
    } else if (['3mo', '6mo', '1y'].includes(newTimeframe) && ['1m', '2m', '5m', '15m', '30m'].includes(interval)) {
      setInterval('1d');
    }
  };

  const intervals = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '1D', value: '1d' },
    { label: '1W', value: '1wk' },
    { label: '1M', value: '1mo' },
  ];

  const timeframes = [
    { label: '1D', value: '1d' },
    { label: '5D', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
    { label: 'Custom', value: 'custom' },
  ];

  const mainIndicators = ['MA', 'EMA', 'WMA', 'BOLL', 'VWAP', 'SAR', 'SUPER', 'NONE'];
  const subIndicators = ['VOL', 'MACD', 'RSI', 'KDJ', 'OBV', 'CCI', 'StochRSI', 'WR', 'DMI', 'MTM', 'EMV', 'MFI', 'TRIX', 'AVL', 'NONE'];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
            上
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              上证指数 <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">SH000001</span>
            </h1>
            <div className="flex items-center gap-3 text-sm mt-1">
              {quote ? (
                <>
                  <span className={`text-2xl font-bold ${quote.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {quote.price.toFixed(2)}
                  </span>
                  <span className={`font-medium ${quote.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)}
                  </span>
                  <span className={`font-medium ${quote.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {quote.change > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-gray-400">Loading quote...</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Market Closed</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Chart */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbars */}
          <div className="bg-white p-2 rounded-lg border border-gray-200 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex items-center gap-1 flex-wrap bg-gray-100 p-1 rounded-md">
              {intervals.map(int => (
                <button
                  key={int.value}
                  onClick={() => handleIntervalChange(int.value)}
                  className={`px-3 py-1 text-xs font-medium rounded ${interval === int.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  {int.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block h-6 w-px bg-gray-300 mx-2"></div>

            <div className="flex items-center gap-1 flex-wrap bg-gray-100 p-1 rounded-md">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => handleTimeframeChange(tf.value)}
                  className={`px-3 py-1 text-xs font-medium rounded ${timeframe === tf.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {timeframe === 'custom' && (
              <div className="flex items-center gap-2 ml-2 flex-wrap">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                />
              </div>
            )}
            
            <div className="hidden sm:block h-6 w-px bg-gray-300 mx-2"></div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</span>
              <div className="flex gap-1 flex-wrap">
                {mainIndicators.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setMainIndicator(ind)}
                    className={`px-2 py-1 text-xs font-medium rounded border ${mainIndicator === ind ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[450px] flex flex-col relative">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 z-10 bg-white flex items-center justify-center text-red-500">
                {error}
              </div>
            )}
            {!loading && !error && data.length > 0 && (
              <StockChart data={data} mainIndicator={mainIndicator} subIndicators={selectedSubIndicators} />
            )}
          </div>

          {/* Sub Indicators Toolbar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col gap-3 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Indicators</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 uppercase font-medium">Slot {index + 1}</label>
                  <select
                    value={selectedSubIndicators[index]}
                    onChange={(e) => {
                      const newIndicators = [...selectedSubIndicators];
                      newIndicators[index] = e.target.value;
                      setSelectedSubIndicators(newIndicators);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {subIndicators.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Quote Details
            </h3>
            {quote ? (
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Open</div>
                  <div className={`font-medium ${quote.open > quote.price ? 'text-green-600' : 'text-red-600'}`}>
                    {quote.open.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Prev Close</div>
                  <div className="font-medium text-gray-900">
                    {(quote.price - quote.change).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">High</div>
                  <div className="font-medium text-red-600">
                    {quote.high.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Low</div>
                  <div className="font-medium text-green-600">
                    {quote.low.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500 mb-1">Volume</div>
                  <div className="font-medium text-gray-900">
                    {(quote.volume / 100000000).toFixed(2)} B
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Loading...</div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              About SH000001
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The SSE Composite Index is a stock market index of all stocks (A shares and B shares) that are traded at the Shanghai Stock Exchange. It is a capitalization-weighted index.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
