import React, { useState } from 'react';
import { Camera, Loader, AlertCircle, CheckCircle, Eye, Shield, AlertTriangle, Star } from 'lucide-react';
import { analyzeVehiclePhotos, readLicensePlate } from '../lib/claude';
import { upsertVehicle } from '../lib/storage';

export default function VehicleAnalysis({ vehicles, setVehicles }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [plateLoading, setPlateLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [plateResult, setPlateResult] = useState(null);
  const [selectedPhotoForPlate, setSelectedPhotoForPlate] = useState(null);

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const photosToAnalyze = [
    ...uploadedPhotos,
    ...(photoUrls ? photoUrls.split('\n').map((u) => u.trim()).filter(Boolean) : []),
    ...(vehicle?.photos || []),
  ].slice(0, 6);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const readers = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((results) =>
      setUploadedPhotos((prev) => [...prev, ...results].slice(0, 6))
    );
    e.target.value = '';
  };

  const runAnalysis = async () => {
    if (photosToAnalyze.length === 0) {
      setError('Add at least one photo to analyze');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeVehiclePhotos(photosToAnalyze, vehicle || {});
      data.analyzed_at = new Date().toISOString();
      setResult(data);

      if (vehicle) {
        const updated = upsertVehicle({ ...vehicle, ai_analysis: data });
        setVehicles(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runPlateLookup = async (photoSrc) => {
    setPlateLoading(true);
    setPlateResult(null);
    try {
      const data = await readLicensePlate(photoSrc);
      setPlateResult(data);
    } catch (err) {
      setPlateResult({ error: err.message });
    } finally {
      setPlateLoading(false);
    }
  };

  const BUY_COLORS = {
    strong_buy: 'text-green-700 bg-green-100',
    buy: 'text-green-600 bg-green-50',
    neutral: 'text-yellow-700 bg-yellow-100',
    pass: 'text-red-600 bg-red-50',
    strong_pass: 'text-red-700 bg-red-100',
  };

  const BUY_LABELS = {
    strong_buy: 'Strong Buy',
    buy: 'Buy',
    neutral: 'Neutral',
    pass: 'Pass',
    strong_pass: 'Strong Pass',
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Vehicle Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          Use Claude Vision to analyze vehicle photos, assess condition, and read license plates
        </p>
      </div>

      {/* Vehicle selector */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Link to Vehicle (Optional)</h3>
        <select
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          value={selectedVehicleId}
          onChange={(e) => {
            setSelectedVehicleId(e.target.value);
            setUploadedPhotos([]);
            setPhotoUrls('');
            setResult(null);
            setPlateResult(null);
          }}
        >
          <option value="">— Analyze without linking to a vehicle —</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title || `${v.year} ${v.make} ${v.model}`}
              {v.price > 0 ? ` – $${v.price.toLocaleString()}` : ''}
            </option>
          ))}
        </select>
        {vehicle?.ai_analysis && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <CheckCircle size={13} />
            Previously analyzed on {new Date(vehicle.ai_analysis.analyzed_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Photo input */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Photos to Analyze</h3>

        {/* Upload */}
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4">
          <Camera size={28} className="text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            <span className="text-blue-600 font-medium">Click to upload photos</span> or drag & drop
          </p>
          <p className="text-xs text-gray-400 mt-1">Up to 6 photos (JPG, PNG, WEBP)</p>
          <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
        </label>

        {/* URL input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Or paste photo URLs (one per line)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="https://example.com/car-photo-1.jpg&#10;https://example.com/car-photo-2.jpg"
            value={photoUrls}
            onChange={(e) => setPhotoUrls(e.target.value)}
          />
        </div>

        {/* Preview grid */}
        {photosToAnalyze.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">{photosToAnalyze.length} photo{photosToAnalyze.length !== 1 ? 's' : ''} queued for analysis</p>
              {uploadedPhotos.length > 0 && (
                <button onClick={() => setUploadedPhotos([])} className="text-xs text-red-500 hover:text-red-700">
                  Clear uploads
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photosToAnalyze.map((src, i) => (
                <div key={i} className="relative group aspect-[4/3]">
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-lg" onError={(e) => { e.target.src = ''; e.target.parentElement.style.display = 'none'; }} />
                  <button
                    onClick={() => { setSelectedPhotoForPlate(src); runPlateLookup(src); }}
                    className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye size={10} className="inline mr-0.5" />
                    Read plate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={loading || photosToAnalyze.length === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : <Eye size={16} />}
          {loading ? 'Analyzing with Claude Vision…' : 'Analyze Photos'}
        </button>
      </div>

      {/* Plate result */}
      {(plateLoading || plateResult) && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            License Plate Read
          </h3>
          {plateLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader size={14} className="animate-spin" />
              Reading plate…
            </div>
          ) : plateResult?.error ? (
            <p className="text-sm text-red-600">{plateResult.error}</p>
          ) : plateResult?.found ? (
            <div className="flex items-center gap-4">
              <div className="bg-gray-900 text-yellow-400 font-mono font-bold text-xl px-4 py-2 rounded-lg tracking-widest">
                {plateResult.plate}
              </div>
              {plateResult.state && (
                <div className="text-sm text-gray-600">
                  State: <span className="font-semibold">{plateResult.state}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No license plate detected in this photo.</p>
          )}
        </div>
      )}

      {/* Analysis result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Analysis Results</h3>
            <div className="flex items-center gap-3">
              <div className={`text-sm font-semibold px-3 py-1.5 rounded-full ${BUY_COLORS[result.buy_recommendation] || 'bg-gray-100 text-gray-700'}`}>
                {BUY_LABELS[result.buy_recommendation] || result.buy_recommendation}
              </div>
              <ConditionBadge score={result.condition_score} label={result.condition_label} />
            </div>
          </div>

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Condition Score</span>
              <span className="font-bold text-gray-900">{result.condition_score}/10</span>
            </div>
            <div className="bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  result.condition_score >= 7 ? 'bg-green-500' : result.condition_score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.condition_score * 10}%` }}
              />
            </div>
          </div>

          {/* Recommendation */}
          {result.recommendation_reason && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border-l-4 border-blue-400">
              {result.recommendation_reason}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Issues */}
            {result.flags?.length > 0 && !result.flags.includes('clean') && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Issues Found
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.flags.filter(f => f !== 'clean').map((f) => (
                    <span key={f} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {result.damage_notes && (
                  <p className="text-xs text-gray-600 mt-2">{result.damage_notes}</p>
                )}
              </div>
            )}

            {/* Positives */}
            {result.positives && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                  <Star size={14} /> Positives
                </p>
                <p className="text-xs text-gray-600">{result.positives}</p>
              </div>
            )}
          </div>

          {/* Plate */}
          {result.plate_detected && result.plate_number && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <Shield size={14} className="text-blue-500" />
              <span className="text-sm text-gray-600">Plate detected:</span>
              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {result.plate_number}
              </span>
              {result.plate_state && (
                <span className="text-sm text-gray-500">({result.plate_state})</span>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Analyzed {result.photo_count_analyzed} photo{result.photo_count_analyzed !== 1 ? 's' : ''} · {result.analyzed_at ? new Date(result.analyzed_at).toLocaleString() : 'just now'}
          </p>
        </div>
      )}
    </div>
  );
}

function ConditionBadge({ score, label }) {
  const color =
    score >= 7 ? 'bg-green-100 text-green-800' :
    score >= 5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${color}`}>
      <span className="text-lg font-bold">{score}</span>
      <span className="text-xs">/10 · {label}</span>
    </div>
  );
}
