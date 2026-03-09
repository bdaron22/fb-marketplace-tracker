/**
 * Apify integration for Facebook Marketplace scraping.
 * Actor: apify/facebook-marketplace-scraper
 * Docs: https://apify.com/apify/facebook-marketplace-scraper
 */

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'apify~facebook-marketplace-scraper';

function getToken() {
  return (
    import.meta.env.VITE_APIFY_TOKEN ||
    import.meta.env.VITE_apify_token ||
    localStorage.getItem('t1000:apify_token') ||
    ''
  );
}

/**
 * Start a scrape run and poll until completion.
 * Returns the array of scraped vehicle items.
 */
export async function scrapeMarketplace({ searchTerms, location, maxPrice, minYear, maxResults = 50 }, onStatus) {
  const token = getToken();
  if (!token) throw new Error('Apify API token not configured. Add it in Settings.');

  onStatus?.('Starting Apify actor run...');

  // Build actor input
  const input = {
    searchTerms: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
    maxResults,
    ...(location && { locationGeoId: location }),
    ...(maxPrice && { maxPrice: Number(maxPrice) }),
  };

  // Start the actor run
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

  onStatus?.(`Run started (ID: ${runId}). Scraping Facebook Marketplace...`);

  // Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await delay(5000);
    attempts++;
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    const { data: runStatus } = await statusRes.json();

    if (runStatus.status === 'SUCCEEDED') {
      onStatus?.('Scrape complete. Fetching results...');
      break;
    }
    if (runStatus.status === 'FAILED' || runStatus.status === 'ABORTED') {
      throw new Error(`Apify run ${runStatus.status.toLowerCase()}`);
    }
    onStatus?.(`Scraping... (${attempts * 5}s elapsed, status: ${runStatus.status})`);
  }

  // Fetch dataset items
  const datasetId = run.defaultDatasetId;
  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json&limit=${maxResults}`
  );
  if (!itemsRes.ok) throw new Error('Failed to fetch dataset items');
  const items = await itemsRes.json();

  onStatus?.(`Found ${items.length} listings.`);
  return normalizeApifyItems(items, minYear);
}

/**
 * Normalize raw Apify items into T1000 vehicle objects.
 */
function normalizeApifyItems(items, minYear) {
  return items
    .map((item) => {
      const title = item.title || item.name || '';
      const { year, make, model } = parseTitle(title);

      if (minYear && year && Number(year) < Number(minYear)) return null;

      return {
        id: `apify-${item.id || item.listingId || Math.random().toString(36).slice(2)}`,
        fb_url: item.url || item.listingUrl || '',
        title,
        price: parsePrice(item.price),
        year,
        make,
        model,
        trim: '',
        mileage: parseMileage(item.attributes || item.description || ''),
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
  // Try to extract YEAR MAKE MODEL from common FB listing title formats
  const match = title.match(/^(\d{4})\s+([A-Za-z-]+)\s+(.+?)(?:\s+[-–]|$)/);
  if (match) {
    return { year: match[1], make: match[2], model: match[3].trim() };
  }
  return { year: '', make: '', model: title };
}

function parsePrice(raw) {
  if (!raw) return 0;
  const str = String(raw).replace(/[^0-9.]/g, '');
  return parseFloat(str) || 0;
}

function parseMileage(text) {
  const match = String(text).match(/(\d[\d,]*)\s*(?:mi|miles|mile)/i);
  if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  return 0;
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
