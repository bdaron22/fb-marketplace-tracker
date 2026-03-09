import React, { useMemo } from 'react';
import {
  Car, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle,
  DollarSign, BarChart2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { loadFeedback } from '../lib/storage';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Car },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  negotiating: { label: 'Negotiating', color: 'bg-orange-100 text-orange-700', icon: TrendingUp },
  purchased: { label: 'Purchased', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  passed: { label: 'Passed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

function StatCard({ icon: Icon, label, value, sub, color = 'blue', onClick }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`bg-${color}-50 p-3 rounded-lg`}>
          <Icon size={22} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ vehicles, onSelectVehicle }) {
  const stats = useMemo(() => {
    const byStatus = {};
    let analyzed = 0, withVIN = 0, withAccuTrade = 0;
    let priceSum = 0, priceCount = 0;
    let dealDiffSum = 0, dealDiffCount = 0;
    const today = new Date().toISOString().split('T')[0];
    const followUps = [];

    vehicles.forEach((v) => {
      byStatus[v.lead_status] = (byStatus[v.lead_status] || 0) + 1;
      if (v.ai_analysis) analyzed++;
      if (v.vin_data) withVIN++;
      if (v.accutrade_value) withAccuTrade++;
      if (v.price > 0) { priceSum += v.price; priceCount++; }
      if (v.lead_status === 'purchased' && v.offer_price && v.price) {
        dealDiffSum += v.price - v.offer_price;
        dealDiffCount++;
      }
      if (
        v.follow_up_date &&
        v.follow_up_date <= today &&
        v.lead_status !== 'purchased' &&
        v.lead_status !== 'passed'
      ) {
        followUps.push(v);
      }
    });

    const feedback = loadFeedback();
    return {
      total: vehicles.length,
      byStatus,
      analyzed,
      withVIN,
      withAccuTrade,
      avgAskingPrice: priceCount ? Math.round(priceSum / priceCount) : 0,
      avgDealDiff: dealDiffCount ? Math.round(dealDiffSum / dealDiffCount) : 0,
      followUps,
      goodFeedback: feedback.filter((f) => f.rating === 'good').length,
      badFeedback: feedback.filter((f) => f.rating === 'bad').length,
    };
  }, [vehicles]);

  const recentVehicles = vehicles.slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">T1000 vehicle sourcing overview</p>
      </div>

      {/* Follow-up alerts */}
      {stats.followUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-amber-800">
              {stats.followUps.length} lead{stats.followUps.length !== 1 ? 's' : ''} need follow-up today
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {stats.followUps.map((v) => v.title || `${v.year} ${v.make} ${v.model}`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehicles" value={stats.total} sub="in database" color="blue" />
        <StatCard
          icon={DollarSign}
          label="Avg Asking Price"
          value={stats.avgAskingPrice ? `$${stats.avgAskingPrice.toLocaleString()}` : '—'}
          sub="across all vehicles"
          color="green"
        />
        <StatCard
          icon={BarChart2}
          label="AI Analyzed"
          value={stats.analyzed}
          sub={`of ${stats.total} vehicles`}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Savings"
          value={stats.avgDealDiff ? `$${stats.avgDealDiff.toLocaleString()}` : '—'}
          sub="ask vs purchase price"
          color="orange"
        />
      </div>

      {/* Pipeline + Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Lead Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = stats.byStatus[status] || 0;
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full w-24 text-center ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data coverage */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Data Coverage</h3>
          <div className="space-y-4">
            <CoverageRow label="VIN Decoded" value={stats.withVIN} total={stats.total} color="blue" />
            <CoverageRow label="AccuTrade ACV" value={stats.withAccuTrade} total={stats.total} color="green" />
            <CoverageRow label="AI Analyzed" value={stats.analyzed} total={stats.total} color="purple" />
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Feedback Training Data</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <ThumbsUp size={14} className="text-green-500" />
                  <span className="font-semibold text-green-600">{stats.goodFeedback}</span>
                  <span className="text-gray-400">good</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <ThumbsDown size={14} className="text-red-500" />
                  <span className="font-semibold text-red-600">{stats.badFeedback}</span>
                  <span className="text-gray-400">bad</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vehicles */}
      {recentVehicles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Vehicles</h3>
          <div className="divide-y divide-gray-100">
            {recentVehicles.map((v) => {
              const cfg = STATUS_CONFIG[v.lead_status] || STATUS_CONFIG.new;
              return (
                <div
                  key={v.id}
                  className="py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => onSelectVehicle?.(v)}
                >
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt={v.title}
                      className="w-14 h-10 object-cover rounded-lg shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Car size={18} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {v.title || `${v.year} ${v.make} ${v.model}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.price > 0 ? `$${v.price.toLocaleString()}` : 'Price unknown'}
                      {v.mileage > 0 ? ` · ${v.mileage.toLocaleString()} mi` : ''}
                      {v.location ? ` · ${v.location}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {v.ai_analysis && (
                    <span
                      className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        v.ai_analysis.condition_score >= 7
                          ? 'bg-green-100 text-green-700'
                          : v.ai_analysis.condition_score >= 5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {v.ai_analysis.condition_score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vehicles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Car size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No vehicles yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Use the Marketplace tab to scrape FB listings, or add vehicles manually in Leads.
          </p>
        </div>
      )}
    </div>
  );
}

function CoverageRow({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">
          {value}/{total}
        </span>
      </div>
      <div className="bg-gray-100 rounded-full h-1.5">
        <div
          className={`bg-${color}-500 h-1.5 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
