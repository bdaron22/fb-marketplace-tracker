import React, { useState } from 'react';
import { Search, Play, Plus, ExternalLink, Camera, Loader, CheckCircle, AlertCircle, Car, MapPin } from 'lucide-react';
import { scrapeMarketplace } from '../lib/apify';
import { extractLeadsFromScreenshot } from '../lib/claude';
import { blankVehicle, generateId } from '../lib/storage';

const LOCATION = '63011';
const RADIUS_OPTIONS = [10, 25, 50, 100];
const MAX_RESULTS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function Scraper({ onVehiclesFound }) {
  const [radius, setRadius] = useState(25);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minMiles, setMinMiles] = useState('');
  const [maxMiles, setMaxMiles] = useState('');
  const [maxResults, setMaxResults] = useState(5);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(new Set());

  const [uploading, setUploading] = useState(false);

  const runScraper = async () => {
    setError('');
    setRunning(true);
    setStatus('');
    setResults([]);
    try {
      const vehicles = await scrapeMarketplace(
        { location: LOCATION, radius, minPrice, maxPrice, minMiles, maxMiles, maxResults },
        setStatus
      );
      setResults(vehicles);
      if (vehicles.length === 0) setStatus('No results found. Try adjusting your filters.');
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setRunning(false);
    }
  };

  const addVehicle = (v) => {
    onVehiclesFound([v]);
    setAdded((prev) => new Set([...prev, v.id]));
  };

  const addAll = () => {
    const toAdd = results.filter((v) => !added.has(v.id));
    if (toAdd.length) {
      onVehiclesFound(toAdd);
      setAdded(new Set(results.map((v) => v.id)));
    }
  };

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const { leads } = await extractLeadsFromScreenshot(base64, file.type);
      if (!leads?.length) {
        setError('No vehicle leads found in screenshot. Try a clearer Messenger screenshot.');
        return;
      }
      const vehicles = leads.map((l) =>
        blankVehicle({
          id: generateId(),
          title: l.title || '',
          seller_name: l.seller_name || '',
          price: l.price || 0,
          notes: l.notes || '',
          source: 'screenshot',
        })
      );
      onVehiclesFound(vehicles);
      setStatus(`Added ${vehicles.length} lead${vehicles.length !== 1 ? 's' : ''} from screenshot.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Marketplace Scraper</h2>
          <p className="text-sm text-gray-500 mt-1">Find vehicles near {LOCATION}</p>
        </div>
        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors shrink-0 ${uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
          <Camera size={15} />
          {uploading ? 'Processing…' : 'Screenshot'}
          <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Search config */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-5">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Search size={17} className="text-blue-500" />
          Search Filters
        </h3>

        {/* Location (locked) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" />
            Location
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm font-semibold text-gray-800">{LOCATION}</span>
            <span className="text-xs text-gray-400">(fixed)</span>
          </div>
        </div>

        {/* Radius toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Radius</label>
          <div className="flex gap-2 flex-wrap">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  radius === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>

        {/* Price range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Mileage range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min miles"
              value={minMiles}
              onChange={(e) => setMinMiles(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Max miles"
              value={maxMiles}
              onChange={(e) => setMaxMiles(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Max results */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Results</label>
          <div className="flex gap-2 flex-wrap">
            {MAX_RESULTS_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMaxResults(n)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  maxResults === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
            {running ? <Loader size={16} className="animate-spin shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            {status}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={runScraper}
            disabled={running}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? 'Scraping…' : 'Run Scraper'}
          </button>
          {results.length > 0 && (
            <button
              onClick={addAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Add All ({results.filter((v) => !added.has(v.id)).length})
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Results — {results.length} listing{results.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">
            {results.map((v) => (
              <div key={v.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 flex items-start gap-3">
                {v.photos?.[0] ? (
                  <img
                    src={v.photos[0]}
                    alt={v.title}
                    className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-12 sm:w-20 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Car size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{v.title}</p>
                    <span className="text-base font-bold text-green-700 shrink-0">
                      {v.price > 0 ? `$${v.price.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[
                      v.mileage > 0 && `${v.mileage.toLocaleString()} mi`,
                      v.location,
                      v.seller_name && `Seller: ${v.seller_name}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {v.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{v.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {added.has(v.id) ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle size={13} /> Added
                      </span>
                    ) : (
                      <button
                        onClick={() => addVehicle(v)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={13} /> Add Lead
                      </button>
                    )}
                    {v.fb_url && (
                      <a
                        href={v.fb_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={12} /> View on FB
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
