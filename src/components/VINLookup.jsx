import React, { useState } from 'react';
import { Search, Loader, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { decodeVIN } from '../lib/vin';

export default function VINLookup({ vehicle, onResult }) {
  const [vin, setVin] = useState(vehicle?.vin || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(vehicle?.vin_data || null);
  const [error, setError] = useState('');

  const lookup = async () => {
    const cleaned = vin.trim().toUpperCase();
    if (cleaned.length !== 17) {
      setError('VIN must be exactly 17 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await decodeVIN(cleaned);
      if (data.error_code && data.error_code !== '0') {
        setError(`VIN decode warning: ${data.error_text || 'Unknown error'}`);
      }
      setResult(data);
      onResult?.({ vin: cleaned, vin_data: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = result
    ? [
        { label: 'Make', value: result.make },
        { label: 'Model', value: result.model },
        { label: 'Year', value: result.model_year },
        { label: 'Trim', value: result.trim },
        { label: 'Series', value: result.series },
        { label: 'Body Style', value: result.body_class },
        { label: 'Drive Type', value: result.drive_type },
        { label: 'Engine', value: result.engine_cylinders ? `${result.engine_cylinders}-cyl${result.engine_displacement ? `, ${result.engine_displacement}L` : ''}` : null },
        { label: 'Fuel Type', value: result.fuel_type },
        { label: 'Transmission', value: result.transmission },
        { label: 'Manufacturer', value: result.manufacturer },
        { label: 'Plant Country', value: result.plant_country },
      ].filter((f) => f.value)
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <p>
          VIN lookup uses the free{' '}
          <a href="https://vpic.nhtsa.dot.gov/api/" target="_blank" rel="noopener noreferrer" className="underline">
            NHTSA vPIC API
          </a>{' '}
          — no API key required.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="1HGCM82633A123456"
          value={vin}
          onChange={(e) => {
            setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''));
            setError('');
          }}
          maxLength={17}
        />
        <button
          onClick={lookup}
          disabled={loading || vin.length !== 17}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
          Decode
        </button>
      </div>

      {vin.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${vin.length === 17 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-gray-500">{vin.length}/17 characters</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <p className="font-semibold text-gray-900">
              {result.model_year} {result.make} {result.model}
            </p>
          </div>

          {/* VIN display */}
          <div className="font-mono text-sm bg-white border border-gray-200 rounded-lg p-2 mb-4 tracking-widest text-center text-gray-700">
            {result.vin}
          </div>

          {/* Field grid */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm font-medium text-gray-800">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Cross-check with vehicle data */}
          {vehicle && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Cross-check with listing</p>
              <div className="space-y-1">
                {[
                  { label: 'Year', listed: vehicle.year, decoded: result.model_year },
                  { label: 'Make', listed: vehicle.make, decoded: result.make },
                  { label: 'Model', listed: vehicle.model, decoded: result.model },
                ].map(({ label, listed, decoded }) => {
                  const match =
                    !listed ||
                    !decoded ||
                    String(listed).toLowerCase() === String(decoded).toLowerCase();
                  return (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${match ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-gray-500">{label}:</span>
                      <span className="font-medium text-gray-700">{listed || '—'}</span>
                      <span className="text-gray-400">→</span>
                      <span className={`font-medium ${match ? 'text-gray-700' : 'text-red-600'}`}>{decoded || '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
