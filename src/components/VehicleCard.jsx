import React from 'react';
import {
  Car, ExternalLink, ThumbsUp, ThumbsDown, Star,
  CheckCircle, AlertTriangle, Clock, TrendingUp, XCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Car },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  negotiating: { label: 'Negotiating', color: 'bg-orange-100 text-orange-700', icon: TrendingUp },
  purchased: { label: 'Purchased', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  passed: { label: 'Passed', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

export default function VehicleCard({ vehicle, onClick, compact = false }) {
  const v = vehicle;
  const cfg = STATUS_CONFIG[v.lead_status] || STATUS_CONFIG.new;
  const StatusIcon = cfg.icon;
  const analysis = v.ai_analysis;
  const scoreColor =
    !analysis
      ? ''
      : analysis.condition_score >= 7
      ? 'bg-green-100 text-green-700'
      : analysis.condition_score >= 5
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

  const isFollowUpDue =
    v.follow_up_date &&
    v.follow_up_date <= new Date().toISOString().split('T')[0] &&
    v.lead_status !== 'purchased' &&
    v.lead_status !== 'passed';

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-100"
        onClick={onClick}
      >
        {v.photos?.[0] ? (
          <img src={v.photos[0]} alt={v.title} className="w-12 h-9 object-cover rounded shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-12 h-9 bg-gray-100 rounded flex items-center justify-center shrink-0">
            <Car size={14} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {v.title || `${v.year} ${v.make} ${v.model}`}
          </p>
          <p className="text-xs text-gray-500">
            {v.price > 0 ? `$${v.price.toLocaleString()}` : 'N/A'}
            {v.mileage > 0 ? ` · ${v.mileage.toLocaleString()} mi` : ''}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow border ${isFollowUpDue ? 'border-amber-300' : 'border-transparent'}`}
      onClick={onClick}
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-100">
        {v.photos?.[0] ? (
          <img src={v.photos[0]} alt={v.title} className="w-full h-full object-cover" onError={(e) => { e.target.parentElement.style.background = '#f3f4f6'; e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car size={40} className="text-gray-300" />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm ${cfg.color}`}>
            <StatusIcon size={10} className="inline mr-0.5" />
            {cfg.label}
          </span>
        </div>
        {analysis && (
          <div className={`absolute top-2 right-2 text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center ${scoreColor}`}>
            {analysis.condition_score}
          </div>
        )}
        {isFollowUpDue && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            <AlertTriangle size={10} /> Follow up
          </div>
        )}
        {v.feedback?.rating === 'good' && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1">
            <ThumbsUp size={12} />
          </div>
        )}
        {v.feedback?.rating === 'bad' && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-1">
            <ThumbsDown size={12} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">
          {v.title || `${v.year} ${v.make} ${v.model}`}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-lg font-bold text-green-700">
            {v.price > 0 ? `$${v.price.toLocaleString()}` : 'Price N/A'}
          </span>
          {v.accutrade_value && (
            <span className="text-xs text-gray-500">
              ACV: <span className="font-semibold text-gray-700">${v.accutrade_value.toLocaleString()}</span>
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          {v.mileage > 0 && <p>{v.mileage.toLocaleString()} miles</p>}
          {v.location && <p>{v.location}</p>}
          {v.seller_name && <p>Seller: {v.seller_name}</p>}
        </div>

        {/* Flags */}
        {analysis?.flags?.length > 0 && !analysis.flags.includes('clean') && (
          <div className="mt-2 flex flex-wrap gap-1">
            {analysis.flags.slice(0, 3).map((flag) => (
              <span key={flag} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* AccuTrade spread */}
        {v.accutrade_value && v.price > 0 && (
          <div className="mt-2">
            <span
              className={`text-xs font-medium ${
                v.price - v.accutrade_value > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {v.price - v.accutrade_value > 0
                ? `$${(v.price - v.accutrade_value).toLocaleString()} over ACV`
                : `$${(v.accutrade_value - v.price).toLocaleString()} under ACV`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-2 text-xs text-gray-400">
            {v.vin_data && <span className="text-blue-500 font-medium">VIN ✓</span>}
            {v.ai_analysis && <span className="text-purple-500 font-medium">AI ✓</span>}
            {v.photos?.length > 1 && <span>{v.photos.length} photos</span>}
          </div>
          {v.fb_url && (
            <a
              href={v.fb_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
