import React, { useState } from 'react';
import { X, ThumbsDown } from 'lucide-react';

const REJECT_TAGS = [
  { id: 'price_too_high', label: 'Price Too High' },
  { id: 'too_many_miles', label: 'Too Many Miles' },
  { id: 'bad_condition', label: 'Bad Condition' },
  { id: 'salvage_title', label: 'Salvage / Rebuilt Title' },
  { id: 'wrong_vehicle_type', label: 'Wrong Vehicle Type' },
  { id: 'suspicious_listing', label: 'Suspicious Listing' },
  { id: 'already_sold', label: 'Already Sold' },
  { id: 'too_far', label: 'Too Far Away' },
  { id: 'no_photos', label: 'No / Bad Photos' },
  { id: 'wont_respond', label: "Won't Respond" },
  { id: 'frame_damage', label: 'Frame Damage' },
  { id: 'flood_damage', label: 'Flood / Water Damage' },
];

export default function RejectModal({ vehicle, onConfirm, onCancel }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [note, setNote] = useState('');

  const toggleTag = (id) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedTags.length === 0 && !note.trim()) {
      // require at least one tag
      return;
    }
    onConfirm({ tags: selectedTags, note: note.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-lg p-2">
              <ThumbsDown size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Reject Listing</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs">{vehicle?.title}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Why are you rejecting this? <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {REJECT_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                  selectedTags.includes(tag.id)
                    ? 'bg-red-50 border-red-400 text-red-700 font-medium'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {selectedTags.includes(tag.id) ? '✓ ' : ''}{tag.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any other details about why you're passing on this one..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={selectedTags.length === 0 && !note.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-lg font-medium transition-colors"
          >
            Reject Listing
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
          >
            Keep
          </button>
        </div>
      </div>
    </div>
  );
}
