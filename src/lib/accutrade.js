/**
 * AccuTrade integration — username/password auth flow.
 *
 * Auth base: https://appraiser3.accu-trade.com
 * Login:     POST /auth/login  { email, password } → { token, ... }
 * Appraise:  POST /api/appraisals  Bearer token + vehicle data
 *
 * Tokens are cached in localStorage for 4 hours to avoid repeated logins.
 * Falls back to algorithmic estimate when credentials are not configured.
 */

const BASE = 'https://appraiser3.accu-trade.com';
const TOKEN_KEY = 't1000:accutrade_token';
const TOKEN_EXP_KEY = 't1000:accutrade_token_exp';
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ─── Credential helpers ────────────────────────────────────────────────────

function getCreds() {
  const stored = JSON.parse(localStorage.getItem('t1000:settings') || '{}');
  return {
    email: stored.accutrade_email || import.meta.env.VITE_ACCUTRADE_EMAIL || '',
    password: stored.accutrade_password || import.meta.env.VITE_ACCUTRADE_PASSWORD || '',
  };
}

function getCachedToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const exp = parseInt(localStorage.getItem(TOKEN_EXP_KEY) || '0', 10);
  if (token && Date.now() < exp) return token;
  return null;
}

function cacheToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + TOKEN_TTL_MS));
}

function clearTokenCache() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * Log in to AccuTrade and return a bearer token.
 * Caches the token for 4 hours.
 */
export async function accuTradeLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error || `AccuTrade login failed (${res.status})`
    );
  }

  const data = await res.json();
  // Handle various token response shapes
  const token =
    data.token ||
    data.access_token ||
    data.accessToken ||
    data.jwt ||
    data.data?.token ||
    data.data?.access_token;

  if (!token) {
    throw new Error('AccuTrade login succeeded but no token was returned.');
  }

  cacheToken(token);
  return token;
}

async function getToken() {
  const cached = getCachedToken();
  if (cached) return cached;

  const { email, password } = getCreds();
  if (!email || !password) {
    throw new Error('AccuTrade credentials not configured. Add email and password in Settings.');
  }

  return accuTradeLogin(email, password);
}

// ─── Appraisal ─────────────────────────────────────────────────────────────

/**
 * Main entry point.
 * Uses real AccuTrade API if credentials are configured, otherwise estimates.
 */
export async function getAccuTradeValue({ year, make, model, trim, mileage, condition, vin }) {
  const { email, password } = getCreds();

  if (email && password) {
    try {
      return await callAccuTradeAPI({ year, make, model, trim, mileage, condition, vin });
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('session expired')) {
        clearTokenCache();
      }
      throw err;
    }
  }

  return estimateACV({ year, make, model, trim, mileage, condition });
}

/**
 * Call the AccuTrade appraisal API.
 * Tries VIN-first if available, falls back to year/make/model.
 * Probes multiple endpoint patterns since their API is not publicly documented.
 */
async function callAccuTradeAPI({ year, make, model, trim, mileage, condition, vin }) {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const body = vin
    ? { vin, mileage: Number(mileage), condition }
    : { year: Number(year), make, model, trim, mileage: Number(mileage), condition };

  const endpoints = [
    '/api/appraisals',
    '/api/v1/appraisals',
    '/api/appraise',
    '/api/v1/vehicle/appraise',
    '/api/vehicles/appraise',
  ];

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 404) continue;

      if (res.status === 401) {
        clearTokenCache();
        throw new Error('AccuTrade session expired. Please try again.');
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `AccuTrade API error ${res.status}`);
      }

      return normalizeResponse(await res.json());
    } catch (err) {
      if (err.message.includes('session expired') || err.message.includes('401')) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Could not reach AccuTrade API. Verify your credentials.');
}

function normalizeResponse(data) {
  const d = data.data || data.appraisal || data.result || data;
  const acv =
    d.acv ?? d.actualCashValue ?? d.actual_cash_value ??
    d.value ?? d.wholesaleValue ?? d.wholesale_value;
  const tradeInLow  = d.trade_in_low  ?? d.tradeInLow  ?? d.tradeInMin  ?? Math.round(acv * 0.93);
  const tradeInHigh = d.trade_in_high ?? d.tradeInHigh ?? d.tradeInMax  ?? Math.round(acv * 1.03);
  const retailLow   = d.retail_low    ?? d.retailLow   ?? d.retailMin   ?? Math.round(acv * 1.1);
  const retailHigh  = d.retail_high   ?? d.retailHigh  ?? d.retailMax   ?? Math.round(acv * 1.22);
  return {
    source: 'accutrade_api',
    acv: Math.round(acv),
    trade_in_low: Math.round(tradeInLow),
    trade_in_high: Math.round(tradeInHigh),
    retail_low: Math.round(retailLow),
    retail_high: Math.round(retailHigh),
    confidence: d.confidence ?? 'high',
    raw: data,
  };
}

// ─── Algorithmic fallback ──────────────────────────────────────────────────

function estimateACV({ year, make, model, trim, mileage, condition }) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - Number(year);
  const msrpEstimate = getBaseMSRP(make, model);

  let depreciatedValue = msrpEstimate;
  for (let i = 0; i < age; i++) {
    const rate = i === 0 ? 0.20 : i === 1 ? 0.15 : 0.10;
    depreciatedValue *= 1 - rate;
  }

  const expectedMiles = age * 15000;
  const mileageAdj = ((Number(mileage) || 0) - expectedMiles) * -0.05;

  const conditionMultiplier = {
    excellent: 1.05,
    good: 1.0,
    fair: 0.88,
    poor: 0.72,
  }[condition?.toLowerCase()] ?? 1.0;

  const acv = Math.max(500, (depreciatedValue + mileageAdj) * conditionMultiplier);

  return {
    source: 'estimate',
    acv: Math.round(acv),
    trade_in_low: Math.round(acv * 0.88),
    trade_in_high: Math.round(acv * 1.02),
    retail_low: Math.round(acv * 1.12),
    retail_high: Math.round(acv * 1.25),
    confidence: 'low',
    note: 'Algorithmic estimate. Add AccuTrade credentials in Settings for live values.',
  };
}

function getBaseMSRP(make, model) {
  const m = (make || '').toLowerCase();
  const mo = (model || '').toLowerCase();
  const luxuryMakes = ['bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'volvo', 'genesis'];
  const premiumMakes = ['honda', 'toyota', 'mazda', 'subaru', 'hyundai', 'kia', 'nissan', 'volkswagen'];
  const truckKw = ['f-150', 'silverado', 'ram', 'sierra', 'tacoma', 'tundra', 'ranger', '1500', 'frontier'];
  const suvKw = ['suv', 'explorer', 'highlander', 'pilot', 'traverse', 'tahoe', 'suburban', 'expedition', 'pathfinder', '4runner', 'cr-v', 'rav4', 'escape', 'equinox', 'rogue'];
  const isTruck = truckKw.some((k) => mo.includes(k));
  const isSUV = suvKw.some((k) => mo.includes(k));
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

// ─── Test connection ───────────────────────────────────────────────────────

export async function testAccuTradeLogin(email, password) {
  try {
    await accuTradeLogin(email, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent – Like new, no issues' },
  { value: 'good', label: 'Good – Minor wear, well maintained' },
  { value: 'fair', label: 'Fair – Visible wear, needs minor work' },
  { value: 'poor', label: 'Poor – Major issues or high mileage' },
];
