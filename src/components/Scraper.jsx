import React, { useState } from 'react';
import { Search, Play, Plus, ExternalLink, Camera, Loader, CheckCircle, AlertCircle, Car } from 'lucide-react';
import { scrapeMarketplace } from '../lib/apify';
import { extractLeadsFromScreenshot } from '../lib/claude';
import { blankVehicle, generateId } from '../lib/storage';

export default function Scraper({ onVehiclesFound }) {
  const [searchTerms, setSearchTerms] = useState('');
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxResults, setMaxResults] = useState(50);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(new Set());

  // Screenshot extraction
  const [uploading, setUploading] = useState(false);

  const runScraper = async () => {
    if (!searchTerms.trim()) {
      setError('Enter at least one search term');
      return;
    }
    setError('');
    setRunning(true);
    setStatus('');
    setResults([]);
    try {
      const terms = searchTerms.split(',').map((s) => s.trim()).filter(Boolean);
      const vehicles = await scrapeMarketplace(
        { searchTerms: terms, location, maxPrice, minYear, maxResults },
        setStatus
      );
      setResults(vehicles);
      if (vehicles.length === 0) setStatus('No results found. Try different search terms.');
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketplace Scraper</h2>
          <p className="text-sm text-gray-500 mt-1">
            Scrape Facebook Marketplace listings via Apify, or extract leads from screenshots
          </p>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
          <Camera size={16} />
          {uploading ? 'Processing…' : 'Screenshot → Leads'}
          <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Search config */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search size={18} className="text-blue-500" />
          Apify Scraper Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Terms <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Toyota Camry, Honda Accord, Ford F-150"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple terms with commas</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / City</label>
            <input
              type="text"
              placeholder="e.g., Orlando, FL"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                placeholder="15000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Year</label>
            <input
              type="number"
              placeholder="2015"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} listings</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {status && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
            {running ? <Loader size={16} className="animate-spin shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            {status}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={runScraper}
            disabled={running || !searchTerms.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? 'Scraping…' : 'Run Scraper'}
          </button>
          {results.length > 0 && (
            <button
              onClick={addAll}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Add All ({results.filter((v) => !added.has(v.id)).length} remaining)
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Results — {results.length} listing{results.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">
            {results.map((v) => (
              <div key={v.id} className="border border-gray-200 rounded-lg p-4 flex items-start gap-4">
                {v.photos?.[0] ? (
                  <img
                    src={v.photos[0]}
                    alt={v.title}
                    className="w-20 h-14 object-cover rounded-lg shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Car size={22} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{v.title}</p>
                    <span className="text-lg font-bold text-green-700 shrink-0">
                      {v.price > 0 ? `$${v.price.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
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
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {added.has(v.id) ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle size={14} /> Added
                    </span>
                  ) : (
                    <button
                      onClick={() => addVehicle(v)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Add Lead
                    </button>
                  )}
                  {v.fb_url && (
                    <a
                      href={v.fb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={12} /> View on FB
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-700 mb-3">Setup Tips</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">1.</span>
            Add your Apify API token in <strong>Settings</strong> to enable the scraper.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">2.</span>
            The scraper uses the <code className="bg-gray-200 px-1 rounded text-xs">apify/facebook-marketplace-scraper</code> actor — make sure it's enabled on your Apify account.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">3.</span>
            Use the <strong>Screenshot → Leads</strong> button to extract leads from Messenger conversation screenshots using Claude AI.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">4.</span>
            Scraped listings are added to your <strong>Leads</strong> tracker for follow-up.
          </li>
        </ul>
      </div>
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
