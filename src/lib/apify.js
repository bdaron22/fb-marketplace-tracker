/**
 * Apify integration for Facebook Marketplace scraping.
 *
 * Routes through the local Express server (/api/scrape) when available,
 * keeping the API key server-side. Falls back to direct Apify calls
 * if the server isn't running (e.g. Vercel/static deploy).
 */

const APIFY_BASE = 'https://api.apify.com/v2';
// Direct-call actor (fallback only)
const ACTOR_ID = 'maxcopell~facebook-marketplace';

function getToken() {
  return (
    import.meta.env.VITE_APIFY_TOKEN ||
    import.meta.env.VITE_apify_token ||
    localStorage.getItem('t1000:apify_token') ||
    ''
  );
}

/**
 * Scrape Facebook Marketplace listings.
 * Tries the local API proxy first, falls back to direct Apify calls.
 */
export async function scrapeMarketplace(
  { query = 'cars', location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults = 10 },
  onStatus
) {
  onStatus?.('Connecting to scraper...');

  // Try server proxy first (avoids CORS + keeps key secure)
  try {
    const probeRes = await fetch('/api/health');
    if (probeRes.ok) {
      return await scrapeViaProxy(
        { query, location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults },
        onStatus
      );
    }
  } catch {
    // Server not running — fall through to direct call
  }

  // Direct Apify call (requires token in Settings)
  return await scrapeDirectly(
    { query, location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults },
    onStatus
  );
}

// ─── Server proxy path ────────────────────────────────────────────────────────

async function scrapeViaProxy(
  { query, location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults },
  onStatus
) {
  onStatus?.('Scraping via local server...');

  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const { items } = await res.json();
  onStatus?.(`Found ${items.length} listings.`);
  return normalizeApifyItems(items, { minYear, maxYear, minMiles, maxMiles, minPrice, maxPrice });
}

// ─── Direct Apify call (fallback) ─────────────────────────────────────────────

async function scrapeDirectly(
  { query, location, radius, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxResults },
  onStatus
) {
  const token = getToken();
  if (!token) {
    throw new Error(
      'Apify API token not configured. Add it in Settings, or run the app with `npm start` to use the server proxy.'
    );
  }

  onStatus?.('Starting Apify actor run (direct)...');

  const input = {
    search: query,
    maxItems: maxResults,
    ...(location && { location }),
    ...(radius && { radius: Number(radius) }),
    ...(minPrice && { minPrice: Number(minPrice) }),
    ...(maxPrice && { maxPrice: Number(maxPrice) }),
  };

  const startRes = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Apify error ${startRes.status}`);
  }
  const { data: run } = await startRes.json();
  const runId = run.id;

  onStatus?.(`Run started (ID: ${runId}). Scraping...`);

  // Poll for completion (max 5 min)
  for (let i = 0; i < 60; i++) {
    await delay(5000);
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    const { data: runStatus } = await statusRes.json();

    if (runStatus.status === 'SUCCEEDED') {
      onStatus?.('Scrape complete. Fetching results...');
      break;
    }
    if (runStatus.status === 'FAILED' || runStatus.status === 'ABORTED') {
      throw new Error(`Apify run ${runStatus.status.toLowerCase()}`);
    }
    onStatus?.(`Scraping... (${(i + 1) * 5}s, status: ${runStatus.status})`);
  }

  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${token}&format=json&limit=${maxResults}`
  );
  if (!itemsRes.ok) throw new Error('Failed to fetch dataset items');
  const items = await itemsRes.json();

  onStatus?.(`Found ${items.length} listings.`);
  return normalizeApifyItems(items, { minYear, maxYear, minMiles, maxMiles, minPrice, maxPrice });
}

// ─── Normalize raw Apify items into T1000 vehicle objects ─────────────────────

function normalizeApifyItems(items, { minYear, maxYear, minMiles, maxMiles, minPrice, maxPrice } = {}) {
  return items
    .map((item) => {
      const title = item.title || item.name || '';
      const { year, make, model } = parseTitle(title);
      const price = parsePrice(item.price);
      const mileage = parseMileage(item.attributes || item.description || '');

      if (minYear && year && Number(year) < Number(minYear)) return null;
      if (maxYear && year && Number(year) > Number(maxYear)) return null;
      if (minPrice && price && price < Number(minPrice)) return null;
      if (maxPrice && price && price > Number(maxPrice)) return null;
      if (minMiles && mileage && mileage < Number(minMiles)) return null;
      if (maxMiles && mileage && mileage > Number(maxMiles)) return null;

      return {
        id: `apify-${item.id || item.listingId || Math.random().toString(36).slice(2)}`,
        fb_url: item.url || item.listingUrl || '',
        title,
        price,
        year,
        make,
        model,
        trim: '',
        mileage,
        vin: '',
        location: item.location?.city || item.locationText || '',
        seller_name: item.sellerName || item.seller?.name || '',
        description: item.description || '',
        photos: extractPhotos(item),
        source: 'apify',
        scraped_at: new Date().toISOString(),
        lead_status: 'new',
        offer_price: null,
        notes: '',
        follow_up_date: '',
        accutrade_value: null,
        accutrade_data: null,
        vin_data: null,
        ai_analysis: null,
        feedback: null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function parseTitle(title) {
  const match = title.match(/^(\d{4})\s+([A-Za-z-]+)\s+(.+?)(?:\s+[-–]|$)/);
  if (match) {
    return { year: match[1], make: match[2], model: match[3].trim() };
  }
  return { year: '', make: '', model: title };
}

function parsePrice(raw) {
  if (!raw) return 0;
  return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
}

function parseMileage(text) {
  const match = String(text).match(/(\d[\d,]*)\s*(?:mi|miles|mile)/i);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
}

function extractPhotos(item) {
  if (Array.isArray(item.images)) return item.images.slice(0, 10);
  if (Array.isArray(item.photos)) return item.photos.slice(0, 10);
  if (item.image) return [item.image];
  return [];
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
