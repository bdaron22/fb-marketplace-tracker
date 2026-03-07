import React, { useState, useEffect } from 'react';
import { Car, RefreshCw, LayoutGrid, List, Eye, EyeOff } from 'lucide-react';
import ScrapePanel from './components/ScrapePanel.jsx';
import VehicleCard from './components/VehicleCard.jsx';
import RejectModal from './components/RejectModal.jsx';

const STORAGE_KEY = 'fb-marketplace-tracker-v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { vehicles: [], rejected: {}, pricing: {}, plates: {} };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [rejected, setRejected] = useState({});   // { vehicleId: { tags, note } }
  const [pricing, setPricing] = useState({});      // { vehicleId: { value, condition } }
  const [plates, setPlates] = useState({});        // { vehicleId: plateString }
  const [loadingPrices, setLoadingPrices] = useState({});
  const [loadingPlates, setLoadingPlates] = useState({});
  const [scraping, setScraping] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [filter, setFilter] = useState('all');

  // Load persisted state on mount
  useEffect(() => {
    const s = loadState();
    setVehicles(s.vehicles || []);
    setRejected(s.rejected || {});
    setPricing(s.pricing || {});
    setPlates(s.plates || {});
  }, []);

  // Persist state on change
  useEffect(() => {
    saveState({ vehicles, rejected, pricing, plates });
  }, [vehicles, rejected, pricing, plates]);

  // ── Scraper results ──────────────────────────────────────────────
  const handleScrapeResults = (newVehicles) => {
    // Deduplicate by URL or id
    const existing = new Set(vehicles.map(v => v.id || v.url));
    const fresh = newVehicles
      .filter(v => !existing.has(v.id || v.url))
      .map(v => ({
        ...v,
        id: v.id || v.url || String(Date.now() + Math.random()),
      }));
    setVehicles(prev => [...fresh, ...prev]);
  };

  // ── Rejection ────────────────────────────────────────────────────
  const openReject = (vehicle) => setRejectTarget(vehicle);

  const confirmReject = ({ tags, note }) => {
    if (!rejectTarget) return;
    setRejected(prev => ({ ...prev, [rejectTarget.id]: { tags, note } }));
    setRejectTarget(null);
  };

  const restoreVehicle = (vehicleId) => {
    setRejected(prev => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  };

  // ── License plate detection ──────────────────────────────────────
  const detectPlate = async (vehicle) => {
    const photoUrl = vehicle.photos?.[0];
    if (!photoUrl) return;

    setLoadingPlates(prev => ({ ...prev, [vehicle.id]: true }));
    try {
      const res = await fetch('/api/detect-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: photoUrl }),
      });
      const data = await res.json();
      if (data.plate) {
        setPlates(prev => ({ ...prev, [vehicle.id]: data.plate }));
      } else {
        setPlates(prev => ({ ...prev, [vehicle.id]: 'Not visible' }));
      }
    } catch {
      setPlates(prev => ({ ...prev, [vehicle.id]: 'Detection failed' }));
    } finally {
      setLoadingPlates(prev => ({ ...prev, [vehicle.id]: false }));
    }
  };

  // ── AccuTrade pricing ────────────────────────────────────────────
  const fetchPrice = async (vehicle) => {
    setLoadingPrices(prev => ({ ...prev, [vehicle.id]: true }));
    try {
      const res = await fetch('/api/accutrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: vehicle.title,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: vehicle.mileage,
          zip: vehicle.zip,
        }),
      });
      const data = await res.json();
      if (data.value) {
        setPricing(prev => ({ ...prev, [vehicle.id]: data }));
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setLoadingPrices(prev => ({ ...prev, [vehicle.id]: false }));
    }
  };

  // ── Clear all data ───────────────────────────────────────────────
  const clearAll = () => {
    if (!window.confirm('Clear all vehicles from the tracker?')) return;
    setVehicles([]);
    setRejected({});
    setPricing({});
    setPlates({});
  };

  // ── Filtered view ────────────────────────────────────────────────
  const activeVehicles = vehicles.filter(v => !rejected[v.id]);
  const rejectedVehicles = vehicles.filter(v => rejected[v.id]);

  const displayList = showRejected
    ? rejectedVehicles
    : activeVehicles;

  const stats = {
    total: vehicles.length,
    active: activeVehicles.length,
    rejected: rejectedVehicles.length,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white rounded-xl p-2">
              <Car size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">FB Marketplace Tracker</h1>
              <p className="text-xs text-gray-500">Apify · AccuTrade · AI Vision</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600">{stats.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-500">{stats.rejected}</div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Toggle view"
            >
              {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
            <button
              onClick={() => setShowRejected(s => !s)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${
                showRejected
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showRejected ? <EyeOff size={15} /> : <Eye size={15} />}
              {showRejected ? 'Hide Rejected' : `Rejected (${stats.rejected})`}
            </button>
            {vehicles.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition-colors"
                title="Clear all"
              >
                <RefreshCw size={13} />
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Scrape Panel */}
        <ScrapePanel
          onResults={handleScrapeResults}
          scraping={scraping}
          setScraping={setScraping}
        />

        {/* Vehicle grid / list */}
        {displayList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Car size={52} className="mx-auto text-gray-300 mb-4" />
            {showRejected ? (
              <>
                <p className="text-lg font-semibold text-gray-500">No rejected vehicles</p>
                <p className="text-sm text-gray-400 mt-1">Vehicles you reject will appear here.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-500">No vehicles yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Use the scraper above to pull listings from Facebook Marketplace.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 font-medium">
                {showRejected ? 'Rejected' : 'Active'} listings — {displayList.length} vehicle{displayList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'
            }>
              {displayList.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  pricing={pricing[vehicle.id]}
                  plate={plates[vehicle.id]}
                  rejected={rejected[vehicle.id]}
                  loadingPrice={!!loadingPrices[vehicle.id]}
                  loadingPlate={!!loadingPlates[vehicle.id]}
                  onReject={() => openReject(vehicle)}
                  onRestore={() => restoreVehicle(vehicle.id)}
                  onDetectPlate={() => detectPlate(vehicle)}
                  onFetchPrice={() => fetchPrice(vehicle)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          vehicle={rejectTarget}
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
