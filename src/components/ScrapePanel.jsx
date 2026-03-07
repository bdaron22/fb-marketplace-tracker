import React, { useState } from 'react';
import { MapPin, DollarSign, Loader2, ChevronDown, ChevronUp, Search, Gauge, Calendar, Navigation } from 'lucide-react';

export default function ScrapePanel({ onResults, scraping, setScraping }) {
  const [open, setOpen] = useState(true);
  const [config, setConfig] = useState({
    location: '63011',
    radius: 110,
    minPrice: '',
    maxPrice: '30000',
    minMiles: '',
    maxMiles: '',
    minYear: '',
    maxYear: '',
    maxItems: 20,
  });
  const [error, setError] = useState('');

  const handleScrape = async () => {
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

  const field = (label, icon, key, placeholder, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={config[key]}
          onChange={e => setConfig({ ...config, [key]: e.target.value })}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

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

          {/* Row 1: Location + Radius + Max Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">ZIP Code</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={config.location}
                  onChange={e => setConfig({ ...config, location: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Radius — <span className="text-blue-600 font-bold">{config.radius} miles</span>
              </label>
              <div className="flex items-center gap-3 pt-1">
                <Navigation size={14} className="text-gray-400 shrink-0" />
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={config.radius}
                  onChange={e => setConfig({ ...config, radius: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>10 mi</span><span>500 mi</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Max Results</label>
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
          </div>

          {/* Row 2: Price range */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {field('Min Price', <DollarSign size={14} />, 'minPrice', '0', 'number')}
            {field('Max Price', <DollarSign size={14} />, 'maxPrice', '30000', 'number')}
            {field('Min Year', <Calendar size={14} />, 'minYear', '2000', 'number')}
            {field('Max Year', <Calendar size={14} />, 'maxYear', new Date().getFullYear().toString(), 'number')}
          </div>

          {/* Row 3: Mileage range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {field('Min Miles', <Gauge size={14} />, 'minMiles', '0', 'number')}
            {field('Max Miles', <Gauge size={14} />, 'maxMiles', '150000', 'number')}
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
              <><Loader2 size={18} className="animate-spin" />Scraping Facebook Marketplace...</>
            ) : (
              <><Search size={18} />Scrape Now</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
