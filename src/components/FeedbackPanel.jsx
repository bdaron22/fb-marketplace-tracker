import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Minus, Save, Info, BookOpen } from 'lucide-react';
import { saveFeedbackEntry, loadFeedback } from '../lib/storage';

const GOOD_REASONS = [
  'Clean title, great price',
  'Under market value',
  'Low mileage for year',
  'Excellent condition',
  'High-demand make/model',
  'Strong profit potential',
  'Clean CarFax',
  'Motivated seller',
];

const BAD_REASONS = [
  'Accident / frame damage',
  'Flood damage signs',
  'Overpriced for condition',
  'Too many miles',
  'Salvage title risk',
  'Too far away',
  'Non-starter make/model',
  'Seller unresponsive',
];

export default function FeedbackPanel({ vehicle, onResult }) {
  // Read storage once on mount via lazy initializer
  const [initialData] = useState(
    () => loadFeedback().find((f) => f.vehicle_id === vehicle.id)
  );

  const [rating, setRating] = useState(initialData?.rating ?? null);
  const [reason, setReason] = useState(initialData?.reason ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [saved, setSaved] = useState(!!initialData);
  const [stats, setStats] = useState({ good: 0, bad: 0, neutral: 0 });

  useEffect(() => {
    const all = loadFeedback();
    setStats({
      good: all.filter((f) => f.rating === 'good').length,
      bad: all.filter((f) => f.rating === 'bad').length,
      neutral: all.filter((f) => f.rating === 'neutral').length,
    });
  }, [saved]);

  const save = () => {
    if (!rating) return;
    const entry = {
      vehicle_id: vehicle.id,
      vehicle_title: vehicle.title || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      rating,
      reason,
      notes,
      offer_price: vehicle.offer_price,
      asking_price: vehicle.price,
      accutrade_value: vehicle.accutrade_value,
      condition_score: vehicle.ai_analysis?.condition_score,
      lead_status: vehicle.lead_status,
    };
    const updated = saveFeedbackEntry(entry);
    setSaved(true);
    onResult?.({ rating, reason, notes });
    // Trigger stats refresh
    setStats({
      good: updated.filter((f) => f.rating === 'good').length,
      bad: updated.filter((f) => f.rating === 'bad').length,
      neutral: updated.filter((f) => f.rating === 'neutral').length,
    });
  };

  const reasonOptions = rating === 'good' ? GOOD_REASONS : rating === 'bad' ? BAD_REASONS : [];

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Training Feedback Loop</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Your ratings help Claude learn your preferences. Feedback is included in AI offer suggestions so Claude can improve over time.
          </p>
        </div>
      </div>

      {/* Rating buttons */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">How do you rate this vehicle as a deal?</p>
        <div className="flex gap-3">
          <RatingButton
            active={rating === 'good'}
            onClick={() => { setRating('good'); setReason(''); setSaved(false); }}
            icon={<ThumbsUp size={20} />}
            label="Good Deal"
            color="green"
          />
          <RatingButton
            active={rating === 'neutral'}
            onClick={() => { setRating('neutral'); setReason(''); setSaved(false); }}
            icon={<Minus size={20} />}
            label="Neutral"
            color="yellow"
          />
          <RatingButton
            active={rating === 'bad'}
            onClick={() => { setRating('bad'); setReason(''); setSaved(false); }}
            icon={<ThumbsDown size={20} />}
            label="Pass / Bad"
            color="red"
          />
        </div>
      </div>

      {/* Reason */}
      {rating && reasonOptions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Primary reason</p>
          <div className="flex flex-wrap gap-2">
            {reasonOptions.map((r) => (
              <button
                key={r}
                onClick={() => { setReason(r); setSaved(false); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  reason === r
                    ? rating === 'good'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-red-600 text-white border-red-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom reason */}
      {rating && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Additional notes (optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Any additional context, what made this a good or bad deal…"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          />
        </div>
      )}

      {rating && (
        <button
          onClick={save}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save size={15} />
          {saved ? 'Feedback Saved ✓' : 'Save Feedback'}
        </button>
      )}

      {/* Stats */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-gray-400" />
          <p className="text-xs font-medium text-gray-600">Training Dataset</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Good Deals" value={stats.good} color="green" />
          <StatBox label="Neutral" value={stats.neutral} color="yellow" />
          <StatBox label="Passes" value={stats.bad} color="red" />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {stats.good + stats.bad + stats.neutral} total feedback entries · used by Claude for offer suggestions
        </p>
      </div>
    </div>
  );
}

function RatingButton({ active, onClick, icon, label, color }) {
  const colorMap = {
    green: {
      active: 'bg-green-600 text-white border-green-600',
      inactive: 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600',
    },
    yellow: {
      active: 'bg-yellow-500 text-white border-yellow-500',
      inactive: 'border-gray-200 text-gray-500 hover:border-yellow-400 hover:text-yellow-600',
    },
    red: {
      active: 'bg-red-600 text-white border-red-600',
      inactive: 'border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600',
    },
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
        active ? colorMap[color].active : colorMap[color].inactive
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function StatBox({ label, value, color }) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
