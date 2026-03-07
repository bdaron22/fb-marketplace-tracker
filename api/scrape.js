// Vercel serverless function — POST /api/scrape
// Calls Apify's Facebook Marketplace scraper actor and returns normalized vehicles.

import { ApifyClient } from 'apify-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, radius = 110, minPrice, maxPrice, minMiles, maxMiles, minYear, maxYear, maxItems = 20 } = req.body || {};

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'APIFY_TOKEN environment variable is not set.' });
  }

  try {
    const client = new ApifyClient({ token });

    // Actor input — adjust to match the exact Apify FB Marketplace actor you're using.
    // Common actor: apify/facebook-marketplace-scraper
    const input = {
      searchQueries: ['used car truck suv'],
      maxItems: Number(maxItems),
      ...(location && { locationCity: location }),
      ...(radius && { radiusMiles: Number(radius) }),
      ...(minPrice && { priceMin: Number(minPrice) }),
      ...(maxPrice && { priceMax: Number(maxPrice) }),
      ...(minYear && { yearMin: Number(minYear) }),
      ...(maxYear && { yearMax: Number(maxYear) }),
      ...(minMiles && { mileageMin: Number(minMiles) }),
      ...(maxMiles && { mileageMax: Number(maxMiles) }),
    };

    const run = await client.actor('apify/facebook-marketplace-scraper').call(input, {
      waitSecs: 120,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Normalize fields — Apify actors use slightly different field names.
    const vehicles = items.map((item, idx) => ({
      id: item.id || item.listingId || `${Date.now()}-${idx}`,
      title: item.title || item.name || item.listingTitle || 'Unknown Vehicle',
      price: parsePrice(item.price || item.listingPrice),
      description: item.description || item.listingDescription || '',
      photos: normalizePhotos(item),
      seller: item.seller?.name || item.sellerName || item.seller || '',
      location: item.location || item.locationText || item.city || '',
      url: item.url || item.listingUrl || item.link || '',
      mileage: extractMileage(item.description || item.title || ''),
      year: extractYear(item.title || ''),
      make: item.make || '',
      model: item.model || '',
      zip: item.zip || item.postalCode || '',
      scrapedAt: new Date().toISOString(),
    }));

    return res.status(200).json({ vehicles, count: vehicles.length });
  } catch (err) {
    console.error('Apify scrape error:', err);
    return res.status(500).json({ error: err.message || 'Scrape failed' });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normalizePhotos(item) {
  if (Array.isArray(item.photos)) return item.photos.map(p => (typeof p === 'string' ? p : p.url || p.src || '')).filter(Boolean);
  if (Array.isArray(item.images)) return item.images.map(p => (typeof p === 'string' ? p : p.url || p.src || '')).filter(Boolean);
  if (item.photo) return [item.photo];
  if (item.imageUrl) return [item.imageUrl];
  return [];
}

function extractMileage(text) {
  const match = text.match(/(\d[\d,]+)\s*(?:mi|miles|mile|km|kilometers)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

function extractYear(text) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}
