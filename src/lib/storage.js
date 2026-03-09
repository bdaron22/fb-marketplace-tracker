/**
 * T1000 Storage Layer
 *
 * When VITE_POCKETBASE_URL is set:
 *   - Async functions use PocketBase as primary source
 *   - localStorage is kept in sync as an offline cache
 *
 * When not set:
 *   - localStorage only
 *
 * Sync functions (loadVehicles, saveVehicles, etc.) always use localStorage
 * and are kept for settings/export use.
 */

import { pbFetchVehicles, pbUpsertVehicle, pbDeleteVehicle } from './pocketbase';

const KEYS = {
  VEHICLES: 't1000:vehicles',
  SETTINGS: 't1000:settings',
  FEEDBACK: 't1000:feedback',
};

// ─── Sync localStorage helpers ────────────────────────────────────────────────

export function loadVehicles() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.VEHICLES) || '[]');
  } catch {
    return [];
  }
}

export function saveVehicles(vehicles) {
  localStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
}

export function upsertVehicle(vehicle) {
  const all = loadVehicles();
  const idx = all.findIndex(
    (v) => v.id === vehicle.id || (vehicle.fb_url && v.fb_url === vehicle.fb_url)
  );
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...vehicle };
  } else {
    all.unshift({ ...vehicle, id: vehicle.id || generateId() });
  }
  saveVehicles(all);
  return all;
}

export function updateVehicle(id, patch) {
  const all = loadVehicles();
  const idx = all.findIndex((v) => v.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    saveVehicles(all);
  }
  return all;
}

export function deleteVehicle(id) {
  const all = loadVehicles().filter((v) => v.id !== id);
  saveVehicles(all);
  return all;
}

// ─── Async PocketBase-first functions ─────────────────────────────────────────

/**
 * Load vehicles from PocketBase (primary) or localStorage (fallback).
 * Also writes PocketBase results back to localStorage as cache.
 */
export async function loadVehiclesAsync() {
  const pbVehicles = await pbFetchVehicles();
  if (pbVehicles !== null) {
    saveVehicles(pbVehicles);
    return pbVehicles;
  }
  return loadVehicles();
}

/**
 * Upsert a vehicle into localStorage + PocketBase.
 * Returns the updated vehicles array from localStorage.
 */
export async function upsertVehicleAsync(vehicle) {
  const v = { ...vehicle, id: vehicle.id || generateId(), updated_at: new Date().toISOString() };
  const all = upsertVehicle(v);
  pbUpsertVehicle(v).catch(() => {}); // fire-and-forget
  return all;
}

/**
 * Delete a vehicle from localStorage + PocketBase.
 */
export async function deleteVehicleAsync(id) {
  const all = deleteVehicle(id);
  pbDeleteVehicle(id).catch(() => {}); // fire-and-forget
  return all;
}

// ─── Feedback CRUD ───────────────────────────────────────────────────────────

export function loadFeedback() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.FEEDBACK) || '[]');
  } catch {
    return [];
  }
}

export function saveFeedbackEntry(entry) {
  const all = loadFeedback();
  const idx = all.findIndex((f) => f.vehicle_id === entry.vehicle_id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...entry, updated_at: new Date().toISOString() };
  } else {
    all.push({ ...entry, id: generateId(), created_at: new Date().toISOString() });
  }
  localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
  return all;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Build a blank vehicle object with all expected fields */
export function blankVehicle(overrides = {}) {
  return {
    id: generateId(),
    fb_url: '',
    title: '',
    price: 0,
    year: '',
    make: '',
    model: '',
    trim: '',
    mileage: 0,
    vin: '',
    location: '',
    seller_name: '',
    description: '',
    photos: [],
    source: 'manual',
    scraped_at: new Date().toISOString(),
    // Lead
    lead_status: 'new',
    offer_price: null,
    notes: '',
    follow_up_date: '',
    // AccuTrade
    accutrade_value: null,
    accutrade_data: null,
    // VIN data
    vin_data: null,
    // AI analysis
    ai_analysis: null,
    // Feedback
    feedback: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
