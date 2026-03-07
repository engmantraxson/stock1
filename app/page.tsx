'use client';

import React, { useEffect, useState } from 'react';
import StockChart from '@/components/StockChart';
import SearchBar from '@/components/SearchBar';
import { ChartData } from '@/lib/indicators';
import { format } from 'date-fns';
import { Activity, TrendingUp, TrendingDown, Clock, BarChart2, Star, Bell, Trash2, Newspaper } from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

export default function Home() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainIndicator, setMainIndicator] = useState('MA');
  const [selectedSubIndicators, setSelectedSubIndicators] = useState<string[]>(['VOL', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE']);
  const [timeframe, setTimeframe] = useState('1y');
  const [interval, setInterval] = useState('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [symbol, setSymbol] = useState('000001.SS');
  const [stockName, setStockName] = useState('上证指数');

  const [quote, setQuote] = useState<any>(null);
  
  const [favorites, setFavorites] = useState<{symbol: string, name: string}[]>([]);
  
  const [alerts, setAlerts] = useState<{id: string, symbol: string, price: number, type: 'above' | 'below'}[]>([]);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertType, setNewAlertType] = useState<'above' | 'below'>('above');

  const [newsText, setNewsText] = useState<string | null>(null);
  const [newsChunks, setNewsChunks] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [triggeredAlerts, setTriggeredAlerts] = useState<any[]>([]);
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);

  // Load favorites and alerts on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('stockFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }

    const savedAlerts = localStorage.getItem('stockAlerts');
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error('Failed to parse alerts', e);
      }
    }
  }, []);

  // Save favorites when changed
  useEffect(() => {
    localStorage.setItem('stockFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save alerts when changed
  useEffect(() => {
    localStorage.setItem('stockAlerts', JSON.stringify(alerts));
  }, [alerts]);

  const toggleFavorite = () => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.symbol === symbol);
      if (isFav) {
        return prev.filter(f => f.symbol !== symbol);
      } else {
        return [...prev, { symbol, name: stockName }];
      }
    });
  };

  const isFavorite = favorites.some(f => f.symbol === symbol);

  const handleAddAlert = () => {
    const price = parseFloat(newAlertPrice);
    if (!isNaN(price) && price > 0) {
      setAlerts(prev => [...prev, {
        id: Date.now().toString(),
        symbol,
        price,
        type: newAlertType
      }]);
      setNewAlertPrice('');
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Fetch news using Gemini API with Google Search grounding
  useEffect(() => {
    const fetchNews = async () => {
      if (!symbol) return;
      setNewsLoading(true);
      setNewsText(null);
      setNewsChunks([]);
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          setNewsText("Gemini API key is missing.");
          setNewsLoading(false);
          return;
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Provide a brief summary of the latest news headlines and events for the stock ${stockName} (${symbol}). Keep it concise and informative.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        
        setNewsText(response.text || 'No news found.');
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          setNewsChunks(chunks);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setNewsText("Failed to load news.");
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [symbol, stockName]);

  const currentStockAlerts = alerts.filter(a => a.symbol === symbol);

  useEffect(() => {
    const checkAlerts = async () => {
      if (alerts.length === 0) {
        setTriggeredAlerts([]);
        return;
      }
      
      const uniqueSymbols = Array.from(new Set(alerts.map(a => a.symbol)));
      
      try {
        const promises = uniqueSymbols.map(sym => 
          fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&interval=1d&range=1d`)
            .then(async res => {
              const contentType = res.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                return { error: 'Received non-JSON response' };
              }
              return res.json();
            })
            .catch(err => {
              console.error(`Failed to fetch alert data for ${sym}:`, err);
              return { error: 'Failed to fetch' };
            })
        );
        
        const results = await Promise.all(promises);
        
        const currentPrices: Record<string, number> = {};
        results.forEach((json, index) => {
          if (!json.error && json.chart?.result?.[0]?.meta?.regularMarketPrice) {
            currentPrices[uniqueSymbols[index]] = json.chart.result[0].meta.regularMarketPrice;
          }
        });
        
        const triggered = alerts.filter(alert => {
          const currentPrice = currentPrices[alert.symbol];
          if (!currentPrice) return false;
          
          if (alert.type === 'above' && currentPrice >= alert.price) return true;
          if (alert.type === 'below' && currentPrice <= alert.price) return true;
          return false;
        });
        
        setTriggeredAlerts(triggered.map(a => ({ ...a, currentPrice: currentPrices[a.symbol] })));
      } catch (err) {
        console.error("Failed to check alerts", err);
      }
    };
    
    checkAlerts();
    const intervalId = window.setInterval(checkAlerts, 60000); // Check every minute
    
    return () => window.clearInterval(intervalId);
  }, [alerts]);

  useEffect(() => {
    const fetchData = async () => {
      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return; // Don't fetch until both dates are selected
      }

      setLoading(true);
      setError(null);
      try {
        let url = `/api/stock?symbol=${encodeURIComponent(symbol)}&interval=${interval}`;
        if (timeframe === 'custom') {
          const p1 = Math.floor(new Date(startDate).getTime() / 1000);
          const p2 = Math.floor(new Date(endDate).getTime() / 1000) + 86399; // end of day
          url += `&period1=${p1}&period2=${p2}`;
        } else {
          url += `&range=${timeframe}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch data');
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Received non-JSON response');
        }
        
        const json = await res.json();
        
        if (json.error) {
          throw new Error(json.error);
        }
        
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
        
        // Remove duplicates, merging data for the same time
        // This ensures we keep the most up-to-date close price while not losing volume data
        // if a subsequent real-time quote has 0 volume.
        const uniqueDataMap = new Map<string | number, ChartData>();
        chartData.forEach(d => {
          if (uniqueDataMap.has(d.time)) {
            const existing = uniqueDataMap.get(d.time)!;
            uniqueDataMap.set(d.time, {
              ...d,
              open: existing.open, // Keep the original open
              high: Math.max(existing.high, d.high),
              low: Math.min(existing.low, d.low),
              volume: Math.max(existing.volume, d.volume),
            });
          } else {
            uniqueDataMap.set(d.time, d);
          }
        });
        const uniqueData = Array.from(uniqueDataMap.values());
        
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
  }, [timeframe, interval, startDate, endDate, symbol]);

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
          <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
            {stockName ? stockName.charAt(0).toUpperCase() : symbol.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {stockName} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{symbol}</span>
              <button 
                onClick={toggleFavorite}
                className={`ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-300'}`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
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
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <SearchBar onSelect={(sym, name) => {
            setSymbol(sym);
            setStockName(name);
          }} />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="relative">
            <button 
              onClick={() => setShowGlobalAlerts(!showGlobalAlerts)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {triggeredAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            
            {showGlobalAlerts && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700 flex justify-between items-center">
                  <span>Triggered Alerts</span>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{triggeredAlerts.length} active</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {triggeredAlerts.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {triggeredAlerts.map(alert => (
                        <li key={alert.id} className="p-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                          setSymbol(alert.symbol);
                          setShowGlobalAlerts(false);
                        }}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-900">{alert.symbol}</span>
                            <span className="text-xs text-gray-500">{alert.type === 'above' ? 'Target ≥' : 'Target ≤'} {alert.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Current Price:</span>
                            <span className={`font-semibold ${alert.type === 'above' ? 'text-green-600' : 'text-red-600'}`}>
                              {alert.currentPrice?.toFixed(2)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No alerts currently triggered.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 hidden sm:flex">
            <Clock className="w-4 h-4" />
            <span>Market Closed</span>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-6 py-3">
        <SearchBar onSelect={(sym, name) => {
          setSymbol(sym);
          setStockName(name);
        }} />
      </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
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
          {/* Favorites List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
              Favorites
            </h3>
            {favorites.length > 0 ? (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {favorites.map((fav) => (
                  <li key={fav.symbol} className={`flex items-center justify-between p-1 rounded-md transition-colors group ${symbol === fav.symbol ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <button
                      onClick={() => {
                        setSymbol(fav.symbol);
                        setStockName(fav.name);
                      }}
                      className="flex-1 text-left flex flex-col truncate pr-2 p-1"
                    >
                      <span className={`text-sm font-medium truncate ${symbol === fav.symbol ? 'text-blue-700' : 'text-gray-900'}`}>{fav.symbol}</span>
                      <span className="text-xs text-gray-500 truncate">{fav.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites(prev => prev.filter(f => f.symbol !== fav.symbol));
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No favorites added yet.</p>
            )}
          </div>

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
              About {symbol}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {stockName} ({symbol}) is currently being viewed. Additional company information would be displayed here.
            </p>
          </div>

          {/* Price Alerts */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Price Alerts
            </h3>
            
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex gap-2">
                <select
                  value={newAlertType}
                  onChange={(e) => setNewAlertType(e.target.value as 'above' | 'below')}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={newAlertPrice}
                  onChange={(e) => setNewAlertPrice(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                />
              </div>
              <button
                onClick={handleAddAlert}
                disabled={!newAlertPrice || isNaN(parseFloat(newAlertPrice))}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Add Alert
              </button>
            </div>

            {currentStockAlerts.length > 0 ? (
              <ul className="space-y-2">
                {currentStockAlerts.map((alert) => {
                  const isTriggered = quote && (
                    (alert.type === 'above' && quote.price >= alert.price) ||
                    (alert.type === 'below' && quote.price <= alert.price)
                  );
                  
                  return (
                    <li key={alert.id} className={`flex items-center justify-between p-2 rounded-md border ${isTriggered ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isTriggered ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-gray-700">
                          {alert.type === 'above' ? '≥' : '≤'} <span className="font-semibold">{alert.price.toFixed(2)}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-2">No alerts set for {symbol}</p>
            )}
          </div>

          {/* News Feed */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-600" />
              Latest News
            </h3>
            
            {newsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : newsText ? (
              <div className="prose prose-sm max-w-none prose-a:text-blue-600 hover:prose-a:text-blue-800">
                <Markdown>{newsText}</Markdown>
                {newsChunks && newsChunks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sources</h4>
                    <ul className="space-y-1">
                      {newsChunks.map((chunk: any, i: number) => {
                        if (chunk.web?.uri) {
                          return (
                            <li key={i} className="text-xs truncate">
                              <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {chunk.web.title || chunk.web.uri}
                              </a>
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-2">No news available for {symbol}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
