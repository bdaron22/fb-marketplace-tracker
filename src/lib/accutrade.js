/**
 * AccuTrade integration.
 *
 * AccuTrade (https://www.accutrade.com) provides real-time ACV (Actual Cash Value)
 * appraisals for dealers. Their API requires a dealer account.
 *
 * If VITE_ACCUTRADE_API_KEY is set, this calls their REST API.
 * Otherwise, it falls back to an algorithmic estimate using NHTSA + depreciation data.
 */

/**
 * Main entry point: get AccuTrade ACV for a vehicle.
 */
export async function getAccuTradeValue({ year, make, model, trim, mileage, condition }) {
  const apiKey =
    import.meta.env.VITE_ACCUTRADE_API_KEY ||
    localStorage.getItem('t1000:accutrade_key') ||
    '';

  if (apiKey) {
    return callAccuTradeAPI({ year, make, model, trim, mileage, condition, apiKey });
  }

  return estimateACV({ year, make, model, trim, mileage, condition });
}

/**
 * Real AccuTrade API call (requires dealer credentials).
 * Endpoint structure based on AccuTrade dealer integration docs.
 */
async function callAccuTradeAPI({ year, make, model, trim, mileage, condition, apiKey }) {
  const res = await fetch('https://api.accutrade.com/v1/appraisal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ year, make, model, trim, mileage, condition }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `AccuTrade API error ${res.status}`);
  }

  const data = await res.json();
  return {
    source: 'accutrade_api',
    acv: data.acv || data.value,
    trade_in_low: data.trade_in_low,
    trade_in_high: data.trade_in_high,
    retail_low: data.retail_low,
    retail_high: data.retail_high,
    confidence: data.confidence,
    raw: data,
  };
}

/**
 * Algorithmic ACV estimate when AccuTrade API key is not available.
 * Uses MSRP lookup tables + depreciation curves.
 * Returns a rough estimate for ballpark guidance only.
 */
function estimateACV({ year, make, model, trim, mileage, condition }) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - Number(year);

  // Base MSRP lookup (rough averages by segment)
  const msrpEstimate = getBaseMSRP(make, model);

  // Depreciation: cars lose ~20% first year, ~15% second, ~10%/yr after
  let depreciatedValue = msrpEstimate;
  for (let i = 0; i < age; i++) {
    const rate = i === 0 ? 0.20 : i === 1 ? 0.15 : 0.10;
    depreciatedValue *= 1 - rate;
  }

  // Mileage adjustment: $0.05 per mile over/under 15k/yr average
  const expectedMiles = age * 15000;
  const mileageDelta = (Number(mileage) || 0) - expectedMiles;
  const mileageAdj = mileageDelta * -0.05;

  // Condition multiplier
  const conditionMultiplier = {
    excellent: 1.05,
    good: 1.0,
    fair: 0.88,
    poor: 0.72,
  }[condition?.toLowerCase()] ?? 1.0;

  const acv = Math.max(500, (depreciatedValue + mileageAdj) * conditionMultiplier);
  const tradeInLow = Math.round(acv * 0.88);
  const tradeInHigh = Math.round(acv * 1.02);
  const retailLow = Math.round(acv * 1.12);
  const retailHigh = Math.round(acv * 1.25);

  return {
    source: 'estimate',
    acv: Math.round(acv),
    trade_in_low: tradeInLow,
    trade_in_high: tradeInHigh,
    retail_low: retailLow,
    retail_high: retailHigh,
    confidence: 'low',
    note: 'Algorithmic estimate only. Configure AccuTrade API key for real values.',
  };
}

// Rough average MSRP by make/segment for depreciation baseline
function getBaseMSRP(make, model) {
  const m = (make || '').toLowerCase();
  const mo = (model || '').toLowerCase();

  const luxuryMakes = ['bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'volvo', 'genesis'];
  const premiumMakes = ['honda', 'toyota', 'mazda', 'subaru', 'hyundai', 'kia', 'nissan', 'volkswagen'];
  const truckKeywords = ['f-150', 'silverado', 'ram', 'sierra', 'tacoma', 'tundra', 'ranger', '1500', 'frontier'];
  const suvKeywords = ['suv', 'explorer', 'highlander', 'pilot', 'traverse', 'tahoe', 'suburban', 'expedition', 'pathfinder', '4runner', 'cr-v', 'rav4', 'escape', 'equinox', 'rogue'];

  const isTruck = truckKeywords.some((k) => mo.includes(k));
  const isSUV = suvKeywords.some((k) => mo.includes(k));
  const isLuxury = luxuryMakes.includes(m);
  const isPremium = premiumMakes.includes(m);

  if (isLuxury && (isTruck || isSUV)) return 65000;
  if (isLuxury) return 52000;
  if (isTruck) return 42000;
  if (isSUV && isPremium) return 38000;
  if (isSUV) return 34000;
  if (isPremium) return 28000;
  return 24000;
}

/**
 * Condition options for the AccuTrade form.
 */
export const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent – Like new, no issues' },
  { value: 'good', label: 'Good – Minor wear, well maintained' },
  { value: 'fair', label: 'Fair – Visible wear, needs minor work' },
  { value: 'poor', label: 'Poor – Major issues or high mileage' },
];
