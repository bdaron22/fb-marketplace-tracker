/**
 * T1000 Storage Layer
 * Uses localStorage as primary store, with optional PocketBase sync.
 * All data mutations go through these functions.
 */

const KEYS = {
  VEHICLES: 't1000:vehicles',
  SETTINGS: 't1000:settings',
  FEEDBACK: 't1000:feedback',
};

// ─── Vehicle CRUD ────────────────────────────────────────────────────────────

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
