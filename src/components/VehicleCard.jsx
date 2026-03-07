import React, { useState } from 'react';
import {
  ExternalLink, ThumbsDown, ChevronLeft, ChevronRight,
  ScanLine, Loader2, Tag, RotateCcw, Car
} from 'lucide-react';

function getDealBadge(askingPrice, marketValue) {
  if (!marketValue || !askingPrice) return null;
  const ratio = askingPrice / marketValue;
  if (ratio <= 0.82) return { label: 'Great Deal', classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  if (ratio <= 0.93) return { label: 'Good Deal', classes: 'bg-blue-100 text-blue-700 border-blue-300' };
  if (ratio <= 1.04) return { label: 'Fair Price', classes: 'bg-gray-100 text-gray-600 border-gray-300' };
  return { label: 'Overpriced', classes: 'bg-red-100 text-red-600 border-red-300' };
}

function PhotoCarousel({ photos, title }) {
  const [idx, setIdx] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
        <Car size={40} />
        <span className="text-sm mt-2">No photos</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
      <img
        src={photos[idx]}
        alt={`${title} photo ${idx + 1}`}
        className="w-full h-full object-cover"
        onError={e => { e.target.src = ''; e.target.style.display = 'none'; }}
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {idx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function VehicleCard({
  vehicle,
  pricing,
  plate,
  rejected,
  loadingPrice,
  loadingPlate,
  onReject,
  onRestore,
  onDetectPlate,
  onFetchPrice,
}) {
  const askingPrice = vehicle.price;
  const marketValue = pricing?.value;
  const deal = getDealBadge(askingPrice, marketValue);

  const rejectedTagLabels = {
    price_too_high: 'Price Too High',
    too_many_miles: 'Too Many Miles',
    bad_condition: 'Bad Condition',
    salvage_title: 'Salvage/Rebuilt Title',
    wrong_vehicle_type: 'Wrong Vehicle Type',
    suspicious_listing: 'Suspicious Listing',
    already_sold: 'Already Sold',
    too_far: 'Too Far Away',
    no_photos: 'No/Bad Photos',
    wont_respond: "Won't Respond",
    frame_damage: 'Frame Damage',
    flood_damage: 'Flood/Water Damage',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
      rejected ? 'border-red-200 opacity-60' : 'border-gray-200 hover:shadow-md'
    }`}>
      {/* Photo */}
      <div className="relative">
        <PhotoCarousel photos={vehicle.photos} title={vehicle.title} />
        {rejected && (
          <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
            <span className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow">
              REJECTED
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">
            {vehicle.title || 'Unknown Vehicle'}
          </h3>
          {deal && !rejected && (
            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${deal.classes}`}>
              {deal.label}
            </span>
          )}
        </div>

        {/* Pricing row */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-bold text-gray-900">
            {askingPrice ? `$${askingPrice.toLocaleString()}` : 'Price N/A'}
          </span>
          {loadingPrice && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Loading AccuTrade...
            </span>
          )}
          {marketValue && !loadingPrice && (
            <span className="text-sm text-gray-500">
              AccuTrade: <span className="font-medium text-gray-700">${marketValue.toLocaleString()}</span>
            </span>
          )}
          {!marketValue && !loadingPrice && (
            <button
              onClick={onFetchPrice}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Get AccuTrade value
            </button>
          )}
        </div>

        {/* Meta info */}
        <div className="space-y-1 text-sm text-gray-600 mb-3">
          {vehicle.mileage && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">🛣</span>
              <span>{Number(vehicle.mileage).toLocaleString()} miles</span>
            </div>
          )}
          {vehicle.seller && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">👤</span>
              <span>{vehicle.seller}</span>
            </div>
          )}
          {vehicle.location && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">📍</span>
              <span>{vehicle.location}</span>
            </div>
          )}
        </div>

        {/* License plate */}
        {plate && (
          <div className="flex items-center gap-2 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <Tag size={14} className="text-yellow-600" />
            <span className="text-sm font-mono font-semibold text-yellow-800">{plate}</span>
            <span className="text-xs text-yellow-600 ml-1">Plate detected</span>
          </div>
        )}

        {/* Description snippet */}
        {vehicle.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {vehicle.description}
          </p>
        )}

        {/* Rejection info */}
        {rejected && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            <div className="flex flex-wrap gap-1 mb-1">
              {rejected.tags.map(t => (
                <span key={t} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                  {rejectedTagLabels[t] || t}
                </span>
              ))}
            </div>
            {rejected.note && <p className="text-xs text-red-600 mt-1">{rejected.note}</p>}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {vehicle.url && (
            <a
              href={vehicle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <ExternalLink size={13} />
              View on FB
            </a>
          )}

          <button
            onClick={onDetectPlate}
            disabled={loadingPlate || !vehicle.photos?.length}
            className="flex items-center gap-1.5 text-xs bg-yellow-50 hover:bg-yellow-100 disabled:bg-gray-50 text-yellow-700 disabled:text-gray-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            {loadingPlate ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ScanLine size={13} />
            )}
            {loadingPlate ? 'Scanning...' : 'Detect Plate'}
          </button>

          {rejected ? (
            <button
              onClick={onRestore}
              className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-medium ml-auto"
            >
              <RotateCcw size={13} />
              Restore
            </button>
          ) : (
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors font-medium ml-auto"
            >
              <ThumbsDown size={13} />
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
