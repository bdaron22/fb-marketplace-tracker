import React, { useState } from 'react';
import { TrendingUp, Loader, AlertCircle, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { getAccuTradeValue, CONDITION_OPTIONS } from '../lib/accutrade';

export default function AccuTradePanel({ vehicle, onResult }) {
  const [form, setForm] = useState({
    year: vehicle?.year || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    trim: vehicle?.trim || '',
    mileage: vehicle?.mileage || '',
    condition: 'good',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(vehicle?.accutrade_data || null);
  const [error, setError] = useState('');

  const hasApiKey =
    !!(import.meta.env.VITE_ACCUTRADE_API_KEY || localStorage.getItem('autoscout:accutrade_key'));

  const lookup = async () => {
    if (!form.year || !form.make || !form.model) {
      setError('Year, make, and model are required');
      return;
    }
    if (!form.mileage) {
      setError('Mileage is required for accurate pricing');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await getAccuTradeValue(form);
      setResult(data);
      onResult?.({
        accutrade_value: data.acv,
        accutrade_data: data,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* API key notice */}
      {!hasApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Using algorithmic estimate</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Add your AccuTrade dealer API key in Settings for real-time ACV values.{' '}
              <a href="https://www.accutrade.com" target="_blank" rel="noopener noreferrer" className="underline">
                Get AccuTrade →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="2018"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Make *</label>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Toyota"
            value={form.make}
            onChange={(e) => setForm({ ...form, make: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Camry"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Trim</label>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="SE, XLE, etc."
            value={form.trim}
            onChange={(e) => setForm({ ...form, trim: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mileage *</label>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="85000"
            type="number"
            value={form.mileage}
            onChange={(e) => setForm({ ...form, mileage: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Condition *</label>
          <select
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={lookup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader size={15} className="animate-spin" /> : <TrendingUp size={15} />}
        {loading ? 'Looking up…' : hasApiKey ? 'Get AccuTrade ACV' : 'Estimate ACV'}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-blue-600" />
            <p className="font-semibold text-blue-900">
              {result.source === 'accutrade_api' ? 'AccuTrade ACV' : 'Estimated ACV'}
            </p>
            {result.source === 'estimate' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Estimate</span>
            )}
          </div>

          {/* Main ACV */}
          <div className="text-4xl font-bold text-blue-900 mb-4">
            ${result.acv?.toLocaleString()}
          </div>

          {/* Price grid */}
          <div className="grid grid-cols-2 gap-3">
            <ValueBox label="Trade-In Range" low={result.trade_in_low} high={result.trade_in_high} color="yellow" />
            <ValueBox label="Retail Range" low={result.retail_low} high={result.retail_high} color="green" />
          </div>

          {/* Comparison to asking price */}
          {vehicle?.price > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-1">vs. Asking Price</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">
                  Asking: <strong>${vehicle.price.toLocaleString()}</strong>
                </span>
                <span
                  className={`font-semibold ${
                    vehicle.price <= result.acv ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {vehicle.price <= result.acv
                    ? `$${(result.acv - vehicle.price).toLocaleString()} under ACV`
                    : `$${(vehicle.price - result.acv).toLocaleString()} over ACV`}
                </span>
              </div>
            </div>
          )}

          {result.note && (
            <p className="text-xs text-blue-600 mt-3 italic">{result.note}</p>
          )}
        </div>
      )}

      {/* AccuTrade link */}
      <a
        href="https://www.accutrade.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ExternalLink size={13} />
        Get real AccuTrade values at accutrade.com
      </a>
    </div>
  );
}

function ValueBox({ label, low, high, color }) {
  const colorMap = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className={`border rounded-lg p-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-base font-bold">
        ${low?.toLocaleString()} – ${high?.toLocaleString()}
      </p>
    </div>
  );
}
