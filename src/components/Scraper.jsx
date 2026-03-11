import React, { useState } from 'react';
import { Play, Plus, ExternalLink, Camera, Loader, CheckCircle, AlertCircle, Car, MapPin, Zap, TrendingUp, Star } from 'lucide-react';
import { scrapeMarketplace } from '../lib/apify';
import { analyzeVehicleListing, extractLeadsFromScreenshot } from '../lib/claude';
import { blankVehicle, generateId } from '../lib/storage';

const RADIUS_OPTIONS = [10, 25, 50, 100];
const MAX_RESULTS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

const LS_LOCATION = 't1000:scraper_location';

const BUY_COLORS = {
  strong_buy: 'bg-green-100 border-green-400 text-green-800',
  buy: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  neutral: 'bg-gray-50 border-gray-200 text-gray-600',
  pass: 'bg-orange-50 border-orange-200 text-orange-600',
  strong_pass: 'bg-red-50 border-red-200 text-red-600',
};

const BUY_LABELS = {
  strong_buy: '🔥 Strong Buy',
  buy: '✅ Buy',
  neutral: '— Neutral',
  pass: '⚠️ Pass',
  strong_pass: '❌ Skip',
};

export default function Scraper({ onVehiclesFound }) {
  const [location, setLocation] = useState(() => localStorage.getItem(LS_LOCATION) || '63011');
  const [radius, setRadius] = useState(25);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minMiles, setMinMiles] = useState('');
  const [maxMiles, setMaxMiles] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxResults, setMaxResults] = useState(10);

  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
    localStorage.setItem(LS_LOCATION, location);

    try {
      const vehicles = await scrapeMarketplace(
        { query: 'cars', location: location.trim() || '63011', radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxResults },
        setStatus
      );

      if (vehicles.length === 0) {
        setStatus('No results found. Try adjusting your filters.');
        setRunning(false);
        return;
      }

      setStatus(`Found ${vehicles.length} listings. Running AI analysis...`);
      setRunning(false);
      setAnalyzing(true);

      // AI-analyze each vehicle in parallel (batches of 5 to avoid rate limits)
      const analyzed = [...vehicles];
      const batchSize = 5;
      for (let i = 0; i < analyzed.length; i += batchSize) {
        const batch = analyzed.slice(i, i + batchSize);
        const promises = batch.map(async (v, idx) => {
          try {
            const ai = await analyzeVehicleListing(v);
            analyzed[i + idx] = { ...v, ai_analysis: ai };
          } catch {
            // Keep vehicle without AI if it fails
          }
        });
        await Promise.all(promises);
        setStatus(`AI analyzing... (${Math.min(i + batchSize, analyzed.length)}/${analyzed.length})`);
      }

      // Sort: strong_buy first, then buy, neutral, pass, strong_pass
      const order = ['strong_buy', 'buy', 'neutral', 'pass', 'strong_pass'];
      analyzed.sort((a, b) => {
        const aIdx = order.indexOf(a.ai_analysis?.buy_recommendation ?? 'neutral');
        const bIdx = order.indexOf(b.ai_analysis?.buy_recommendation ?? 'neutral');
        return aIdx - bIdx;
      });

      setResults(analyzed);
      setStatus(`Done — ${analyzed.filter((v) => ['strong_buy', 'buy'].includes(v.ai_analysis?.buy_recommendation)).length} good buys found.`);
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setRunning(false);
      setAnalyzing(false);
    }
  };

  const addVehicle = (v) => {
    onVehiclesFound([v]);
    setAdded((prev) => new Set([...prev, v.id]));
  };

  const addAll = () => {
    const goodBuys = results.filter(
      (v) => !added.has(v.id) && ['strong_buy', 'buy'].includes(v.ai_analysis?.buy_recommendation)
    );
    const toAdd = goodBuys.length > 0 ? goodBuys : results.filter((v) => !added.has(v.id));
    if (toAdd.length) {
      onVehiclesFound(toAdd);
      setAdded(new Set([...added, ...toAdd.map((v) => v.id)]));
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
        setError('No vehicle leads found in screenshot.');
        return;
      }
      const vehicles = leads.map((l) =>
        blankVehicle({ id: generateId(), title: l.title || '', seller_name: l.seller_name || '', price: l.price || 0, notes: l.notes || '', source: 'screenshot' })
      );
      onVehiclesFound(vehicles);
      setStatus(`Added ${vehicles.length} lead${vehicles.length !== 1 ? 's' : ''} from screenshot.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const goodBuys = results.filter((v) => ['strong_buy', 'buy'].includes(v.ai_analysis?.buy_recommendation));
  const isRunning = running || analyzing;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Marketplace Scraper</h2>
          <p className="text-sm text-gray-500 mt-1">Scrapes vehicles near you and surfaces the best deals with AI</p>
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
          <MapPin size={17} className="text-blue-500" />
          Search Area & Filters
        </h3>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" />
            ZIP / City
          </label>
          <input
            type="text"
            placeholder="63011"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Radius */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Radius</label>
          <div className="flex gap-2 flex-wrap">
            {RADIUS_OPTIONS.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${radius === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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
              <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Mileage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Min miles" value={minMiles} onChange={(e) => setMinMiles(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <input type="number" placeholder="Max miles" value={maxMiles} onChange={(e) => setMaxMiles(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        {/* Min Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Year</label>
          <input type="number" placeholder="e.g. 2015" value={minYear} onChange={(e) => setMinYear(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>

        {/* Max results */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Results</label>
          <div className="flex gap-2 flex-wrap">
            {MAX_RESULTS_OPTIONS.map((n) => (
              <button key={n} onClick={() => setMaxResults(n)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${maxResults === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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
            {isRunning ? <Loader size={16} className="animate-spin shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            {status}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={runScraper} disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {running ? <Loader size={16} className="animate-spin" /> : analyzing ? <Zap size={16} className="animate-pulse" /> : <Play size={16} />}
            {running ? 'Scraping…' : analyzing ? 'Analyzing with AI…' : 'Scrape & Analyze'}
          </button>
          {goodBuys.length > 0 && (
            <button onClick={addAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <Star size={16} />
              Add Good Buys ({goodBuys.filter((v) => !added.has(v.id)).length})
            </button>
          )}
        </div>
      </div>

      {/* Good Buys highlight section */}
      {goodBuys.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <TrendingUp size={17} />
            Good Buys — {goodBuys.length} deal{goodBuys.length !== 1 ? 's' : ''} flagged
          </h3>
          <div className="space-y-2">
            {goodBuys.map((v) => (
              <VehicleRow key={v.id} v={v} added={added.has(v.id)} onAdd={() => addVehicle(v)} />
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            All Results — {results.length} listing{results.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">
            {results.map((v) => (
              <VehicleRow key={v.id} v={v} added={added.has(v.id)} onAdd={() => addVehicle(v)} showDetail />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleRow({ v, added, onAdd, showDetail = false }) {
  const rec = v.ai_analysis?.buy_recommendation;
  const borderClass = BUY_COLORS[rec] || BUY_COLORS.neutral;

  return (
    <div className={`border rounded-lg p-3 sm:p-4 flex items-start gap-3 ${borderClass}`}>
      {v.photos?.[0] ? (
        <img src={v.photos[0]} alt={v.title} className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div className="w-16 h-12 sm:w-20 sm:h-14 bg-white/50 rounded-lg flex items-center justify-center shrink-0">
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
          {[v.mileage > 0 && `${v.mileage.toLocaleString()} mi`, v.location, v.seller_name && `Seller: ${v.seller_name}`].filter(Boolean).join(' · ')}
        </p>

        {rec && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">{BUY_LABELS[rec]}</span>
            {v.ai_analysis?.condition_score && (
              <span className="text-xs text-gray-500">Score: {v.ai_analysis.condition_score}/10</span>
            )}
          </div>
        )}

        {showDetail && v.ai_analysis?.recommendation_reason && (
          <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{v.ai_analysis.recommendation_reason}</p>
        )}

        {showDetail && v.ai_analysis?.estimated_profit > 0 && (
          <p className="text-xs font-medium text-green-700 mt-0.5">
            Est. profit: ${v.ai_analysis.estimated_profit.toLocaleString()}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {added ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle size={13} /> Added
            </span>
          ) : (
            <button onClick={onAdd}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
              <Plus size={13} /> Add Lead
            </button>
          )}
          {v.fb_url && (
            <a href={v.fb_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <ExternalLink size={12} /> View on FB
            </a>
          )}
        </div>
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
