import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchResult {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
  quoteType: string;
}

interface SearchBarProps {
  onSelect: (symbol: string, name: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSelect, placeholder = "Search for stocks, ETFs, indices..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Received non-JSON response');
        }
        
        const data = await res.json();
        setResults(data.quotes || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result.symbol, result.shortname || result.longname || result.symbol);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {results.map((result, index) => (
            <button
              key={`${result.symbol}-${index}`}
              onClick={() => handleSelect(result)}
              className="w-full text-left cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 transition duration-150 ease-in-out"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">
                  {result.symbol}
                </span>
                <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded">
                  {result.exchange}
                </span>
              </div>
              <span className="block text-sm text-gray-500 truncate mt-1">
                {result.shortname || result.longname}
              </span>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && query && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-3 px-4 text-sm text-gray-500 text-center ring-1 ring-black ring-opacity-5">
          No results found for &quot;{query}&quot;
        </div>
      )}
      
      {isOpen && loading && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-3 px-4 text-sm text-gray-500 text-center ring-1 ring-black ring-opacity-5 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          Searching...
        </div>
      )}
    </div>
  );
}
