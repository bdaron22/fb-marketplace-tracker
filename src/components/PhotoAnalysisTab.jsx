import React, { useState } from 'react';
import { Camera, Loader, Eye, AlertCircle, CheckCircle, AlertTriangle, Star, Shield } from 'lucide-react';
import { analyzeVehiclePhotos, readLicensePlate } from '../lib/claude';

export default function PhotoAnalysisTab({ vehicle, onResult }) {
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plateLoading, setPlateLoading] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(vehicle?.ai_analysis || null);

  const existingPhotos = vehicle?.photos || [];
  const allPhotos = [...uploadedPhotos, ...existingPhotos].slice(0, 6);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const readers = files.map(
      (f) =>
        new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((imgs) =>
      setUploadedPhotos((prev) => [...prev, ...imgs].slice(0, 6))
    );
    e.target.value = '';
  };

  const runAnalysis = async () => {
    if (allPhotos.length === 0) {
      setError('No photos to analyze. Upload photos or add a vehicle with photos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await analyzeVehiclePhotos(allPhotos, vehicle);
      data.analyzed_at = new Date().toISOString();
      setResult(data);
      onResult({ ai_analysis: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const readPlate = async (src, idx) => {
    setPlateLoading(idx);
    try {
      const data = await readLicensePlate(src);
      if (data.found && data.plate) {
        setResult((prev) => ({
          ...(prev || {}),
          plate_detected: true,
          plate_number: data.plate,
          plate_state: data.state,
        }));
        onResult({
          ai_analysis: {
            ...(vehicle.ai_analysis || {}),
            plate_detected: true,
            plate_number: data.plate,
            plate_state: data.state,
          },
        });
      } else {
        setError('No plate detected in this photo.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPlateLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Photo grid */}
      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {allPhotos.map((src, i) => (
            <div key={i} className="relative group aspect-[4/3]">
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => { e.target.parentElement.style.display = 'none'; }}
              />
              <button
                onClick={() => readPlate(src, i)}
                disabled={plateLoading !== null}
                className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
              >
                {plateLoading === i ? <Loader size={9} className="animate-spin" /> : <Shield size={9} />}
                Plate
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Camera size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No photos available for this vehicle</p>
        </div>
      )}

      {/* Upload more */}
      <label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-500">
        <Camera size={15} />
        Upload additional photos
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </label>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={runAnalysis}
        disabled={loading || allPhotos.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader size={15} className="animate-spin" /> : <Eye size={15} />}
        {loading ? 'Analyzing…' : result ? 'Re-analyze Photos' : 'Analyze with Claude Vision'}
      </button>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600" />
              <span className="text-sm font-semibold text-gray-800">Analysis Complete</span>
            </div>
            <ConditionPill score={result.condition_score} label={result.condition_label} />
          </div>

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Condition</span>
              <span className="font-bold">{result.condition_score}/10</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  result.condition_score >= 7 ? 'bg-green-500' :
                  result.condition_score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.condition_score * 10}%` }}
              />
            </div>
          </div>

          {/* Buy rec */}
          {result.buy_recommendation && (
            <div className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${BUY_COLORS[result.buy_recommendation]}`}>
              Recommendation: {BUY_LABELS[result.buy_recommendation]}
            </div>
          )}

          {result.recommendation_reason && (
            <p className="text-sm text-gray-600 italic">{result.recommendation_reason}</p>
          )}

          {/* Flags */}
          {result.flags?.filter(f => f !== 'clean').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Issues
              </p>
              <div className="flex flex-wrap gap-1">
                {result.flags.filter(f => f !== 'clean').map((f) => (
                  <span key={f} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                    {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {result.damage_notes && (
                <p className="text-xs text-gray-500 mt-1">{result.damage_notes}</p>
              )}
            </div>
          )}

          {/* Positives */}
          {result.positives && (
            <div>
              <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                <Star size={12} /> Positives
              </p>
              <p className="text-xs text-gray-600">{result.positives}</p>
            </div>
          )}

          {/* Plate */}
          {result.plate_detected && result.plate_number && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
              <Shield size={13} className="text-blue-500" />
              <span className="text-xs text-gray-600">Plate detected:</span>
              <span className="font-mono font-bold text-sm text-gray-900 tracking-widest">
                {result.plate_number}
              </span>
              {result.plate_state && <span className="text-xs text-gray-400">({result.plate_state})</span>}
            </div>
          )}

          <p className="text-xs text-gray-400">
            {result.analyzed_at ? `Analyzed ${new Date(result.analyzed_at).toLocaleString()}` : 'Previously analyzed'}
          </p>
        </div>
      )}
    </div>
  );
}

const BUY_COLORS = {
  strong_buy: 'bg-green-100 text-green-800',
  buy: 'bg-green-50 text-green-700',
  neutral: 'bg-yellow-50 text-yellow-700',
  pass: 'bg-red-50 text-red-700',
  strong_pass: 'bg-red-100 text-red-800',
};

const BUY_LABELS = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  neutral: 'Neutral',
  pass: 'Pass',
  strong_pass: 'Strong Pass',
};

function ConditionPill({ score, label }) {
  const color =
    score >= 7 ? 'bg-green-100 text-green-700' :
    score >= 5 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {score}/10 · {label}
    </span>
  );
}
