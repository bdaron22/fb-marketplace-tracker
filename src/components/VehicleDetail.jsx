import React, { useState } from 'react';
import {
  ArrowLeft, ExternalLink, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, Search, Eye, ThumbsUp, DollarSign,
  Car, Calendar, MapPin, User, Hash, Edit3, Check, X
} from 'lucide-react';
import AccuTradePanel from './AccuTradePanel';
import VINLookup from './VINLookup';
import PhotoAnalysisTab from './PhotoAnalysisTab';
import FeedbackPanel from './FeedbackPanel';
import { loadFeedback } from '../lib/storage';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-orange-100 text-orange-700' },
  { value: 'purchased', label: 'Purchased', color: 'bg-green-100 text-green-700' },
  { value: 'passed', label: 'Passed', color: 'bg-gray-100 text-gray-600' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: Car },
  { id: 'accutrade', label: 'AccuTrade', icon: TrendingUp },
  { id: 'vin', label: 'VIN', icon: Search },
  { id: 'photos', label: 'AI Photos', icon: Eye },
  { id: 'offer', label: 'Offer', icon: DollarSign },
  { id: 'feedback', label: 'Feedback', icon: ThumbsUp },
];

export default function VehicleDetail({ vehicle, onUpdate, onDelete, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(vehicle.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const v = vehicle;
  const photos = v.photos || [];
  const statusCfg = STATUS_OPTIONS.find((s) => s.value === v.lead_status) || STATUS_OPTIONS[0];

  const handlePatch = (patch) => {
    onUpdate({ ...v, ...patch, updated_at: new Date().toISOString() });
  };

  const handleSaveNotes = () => {
    handlePatch({ notes });
    setEditingNotes(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 lg:hidden">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">
            {v.title || `${v.year} ${v.make} ${v.model}`}
          </h2>
          <p className="text-xs text-gray-500">
            {v.price > 0 ? `$${v.price.toLocaleString()}` : 'Price unknown'}
            {v.mileage > 0 ? ` · ${v.mileage.toLocaleString()} mi` : ''}
            {v.location ? ` · ${v.location}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={v.lead_status}
            onChange={(e) => handlePatch({ lead_status: e.target.value })}
            className={`text-xs font-medium px-2 py-1.5 rounded-full border-0 cursor-pointer ${statusCfg.color}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {v.fb_url && (
            <a href={v.fb_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
              <ExternalLink size={16} />
            </a>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(v.id)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-gray-300 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Photo gallery */}
        {photos.length > 0 && (
          <div className="relative bg-black h-56 md:h-72">
            <img
              src={photos[photoIdx]}
              alt={`Photo ${photoIdx + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const hasData =
              (tab.id === 'accutrade' && v.accutrade_value) ||
              (tab.id === 'vin' && v.vin_data) ||
              (tab.id === 'photos' && v.ai_analysis) ||
              (tab.id === 'feedback' && v.feedback);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 shrink-0 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {hasData && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'overview' && (
            <OverviewTab
              vehicle={v}
              notes={notes}
              setNotes={setNotes}
              editingNotes={editingNotes}
              setEditingNotes={setEditingNotes}
              onSaveNotes={handleSaveNotes}
              onPatch={handlePatch}
              onShowOffer={() => { setActiveTab('offer'); }}
            />
          )}
          {activeTab === 'accutrade' && (
            <AccuTradePanel vehicle={v} onResult={handlePatch} />
          )}
          {activeTab === 'vin' && (
            <VINLookup vehicle={v} onResult={handlePatch} />
          )}
          {activeTab === 'photos' && (
            <PhotoAnalysisTab vehicle={v} onResult={handlePatch} />
          )}
          {activeTab === 'offer' && (
            <OfferTab vehicle={v} onPatch={handlePatch} />
          )}
          {activeTab === 'feedback' && (
            <FeedbackPanel vehicle={v} onResult={(fb) => handlePatch({ feedback: fb })} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ vehicle: v, notes, setNotes, editingNotes, setEditingNotes, onSaveNotes, onPatch, onShowOffer }) {
  const analysis = v.ai_analysis;

  return (
    <div className="space-y-5">
      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InfoBox icon={DollarSign} label="Asking Price" value={v.price > 0 ? `$${v.price.toLocaleString()}` : '—'} />
        <InfoBox icon={Car} label="Mileage" value={v.mileage > 0 ? `${v.mileage.toLocaleString()} mi` : '—'} />
        <InfoBox icon={MapPin} label="Location" value={v.location || '—'} />
        <InfoBox icon={User} label="Seller" value={v.seller_name || '—'} />
        <InfoBox icon={Hash} label="VIN" value={v.vin || '—'} mono />
        <InfoBox icon={Calendar} label="Follow-up" value={v.follow_up_date || '—'} />
      </div>

      {/* Follow-up date editor */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
        <input
          type="date"
          value={v.follow_up_date || ''}
          onChange={(e) => onPatch({ follow_up_date: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Offer price */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Your Offer Price</label>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={v.offer_price || ''}
              onChange={(e) => onPatch({ offer_price: e.target.value ? parseFloat(e.target.value) : null })}
              className="pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-36 focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          {v.price > 0 && v.offer_price > 0 && (
            <span className="text-xs text-green-600 font-medium">
              ${(v.price - v.offer_price).toLocaleString()} below ask
            </span>
          )}
          <button
            onClick={onShowOffer}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Get AI suggestion →
          </button>
        </div>
      </div>

      {/* AI summary */}
      {analysis && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-purple-800">AI Analysis Summary</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              analysis.condition_score >= 7 ? 'bg-green-100 text-green-700' :
              analysis.condition_score >= 5 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {analysis.condition_score}/10 · {analysis.condition_label}
            </span>
          </div>
          {analysis.recommendation_reason && (
            <p className="text-sm text-purple-700">{analysis.recommendation_reason}</p>
          )}
          {analysis.flags?.filter(f => f !== 'clean').length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {analysis.flags.filter(f => f !== 'clean').map((f) => (
                <span key={f} className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {analysis.plate_detected && analysis.plate_number && (
            <p className="text-xs text-purple-600 mt-2">
              Plate: <span className="font-mono font-bold">{analysis.plate_number}</span>
              {analysis.plate_state ? ` (${analysis.plate_state})` : ''}
            </p>
          )}
        </div>
      )}

      {/* AccuTrade summary */}
      {v.accutrade_value && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-800">AccuTrade ACV</p>
            <span className="text-lg font-bold text-green-700">${v.accutrade_value.toLocaleString()}</span>
          </div>
          {v.price > 0 && (
            <p className="text-xs text-green-700 mt-1">
              {v.price <= v.accutrade_value
                ? `$${(v.accutrade_value - v.price).toLocaleString()} under ACV — good deal`
                : `$${(v.price - v.accutrade_value).toLocaleString()} over ACV`}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      {v.description && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Listing Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{v.description}</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Notes & Conversation</label>
          {!editingNotes ? (
            <button onClick={() => setEditingNotes(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <Edit3 size={11} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onSaveNotes} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800">
                <Check size={11} /> Save
              </button>
              <button onClick={() => { setEditingNotes(false); setNotes(v.notes || ''); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <X size={11} /> Cancel
              </button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            rows="5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Copy conversations, add notes about condition, seller motivation…"
          />
        ) : (
          <div
            className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[60px] whitespace-pre-wrap cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setEditingNotes(true)}
          >
            {notes || <span className="text-gray-400 italic">Click to add notes…</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offer Tab ────────────────────────────────────────────────────────────────

function OfferTab({ vehicle: v, onPatch }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const { generateOfferSuggestion } = await import('../lib/claude');
      const feedback = (await import('../lib/storage')).loadFeedback();
      const data = await generateOfferSuggestion(v, feedback);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyOffer = (price) => {
    onPatch({ offer_price: price });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Claude will analyze this vehicle's data — AccuTrade ACV, AI condition score, asking price,
        mileage, and your past deal history — to suggest an optimal offer.
      </p>

      {/* Current data summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
        <DataRow label="Asking Price" value={v.price > 0 ? `$${v.price.toLocaleString()}` : '—'} />
        <DataRow label="AccuTrade ACV" value={v.accutrade_value ? `$${v.accutrade_value.toLocaleString()}` : 'Not run'} />
        <DataRow label="AI Condition" value={v.ai_analysis ? `${v.ai_analysis.condition_score}/10 (${v.ai_analysis.condition_label})` : 'Not analyzed'} />
        <DataRow label="Mileage" value={v.mileage > 0 ? `${v.mileage.toLocaleString()} mi` : '—'} />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Generating…</>
        ) : (
          <><DollarSign size={16} /> Generate Offer Suggestion</>
        )}
      </button>

      {result && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-indigo-900 text-lg">Suggested Offer</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              result.strategy === 'lowball' ? 'bg-red-100 text-red-700' :
              result.strategy === 'fair' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {result.strategy}
            </span>
          </div>

          <div className="text-4xl font-bold text-indigo-900">
            ${result.offer_price?.toLocaleString()}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <RangeBox label="Low" value={result.offer_range_low} color="green" />
            <RangeBox label="Offer" value={result.offer_price} color="indigo" highlight />
            <RangeBox label="Walk Away" value={result.walk_away_price} color="red" />
          </div>

          {result.reasoning && (
            <p className="text-sm text-indigo-800 bg-indigo-100 rounded-lg p-3">{result.reasoning}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.estimated_retail && (
              <DataRow label="Est. Retail" value={`$${result.estimated_retail.toLocaleString()}`} />
            )}
            {result.estimated_profit && (
              <DataRow label="Est. Profit" value={`$${result.estimated_profit.toLocaleString()}`} />
            )}
          </div>

          {result.red_flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-1">Red Flags</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {result.red_flags.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={() => applyOffer(result.offer_price)}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Apply ${result.offer_price?.toLocaleString()} as My Offer
          </button>
        </div>
      )}
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, mono }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        <Icon size={12} />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-medium text-gray-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function RangeBox({ label, value, color, highlight }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    indigo: 'bg-indigo-600 border-indigo-600 text-white',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`border rounded-lg p-2 text-center ${colors[color]}`}>
      <p className="text-xs mb-0.5 opacity-75">{label}</p>
      <p className="font-bold">${value?.toLocaleString() || '—'}</p>
    </div>
  );
}
