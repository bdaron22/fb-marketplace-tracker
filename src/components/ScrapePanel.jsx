import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ScrapePanel({ onResults, scraping, setScraping }) {
  const [open, setOpen] = useState(true);
  const [config, setConfig] = useState({
    keywords: 'used car truck suv',
    location: '',
    minPrice: '',
    maxPrice: '30000',
    maxItems: 20,
  });
  const [error, setError] = useState('');

  const handleScrape = async () => {
    if (!config.keywords.trim()) {
      setError('Please enter search keywords.');
      return;
    }
    setError('');
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scrape failed');
      onResults(data.vehicles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-lg p-2">
            <Search size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Apify Scraper — Facebook Marketplace</h2>
            <p className="text-sm text-gray-500">Pull live listings directly into your tracker</p>
          </div>
        </div>
        {open ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Search Keywords *
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. toyota camry 2018"
                  value={config.keywords}
                  onChange={e => setConfig({ ...config, keywords: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Location (City or ZIP)
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Dallas, TX"
                  value={config.location}
                  onChange={e => setConfig({ ...config, location: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Max Results
              </label>
              <select
                value={config.maxItems}
                onChange={e => setConfig({ ...config, maxItems: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 listings</option>
                <option value={20}>20 listings</option>
                <option value={50}>50 listings</option>
                <option value={100}>100 listings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Min Price
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="0"
                  value={config.minPrice}
                  onChange={e => setConfig({ ...config, minPrice: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Max Price
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="50000"
                  value={config.maxPrice}
                  onChange={e => setConfig({ ...config, maxPrice: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {scraping ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Scraping Facebook Marketplace...
              </>
            ) : (
              <>
                <Search size={18} />
                Scrape Now
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
