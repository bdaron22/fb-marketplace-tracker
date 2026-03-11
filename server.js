import express from 'express';
import { config } from 'dotenv';
import { networkInterfaces } from 'os';

config();

const app = express();
app.use(express.json());

/**
 * POST /api/scrape
 * Proxies a Facebook Marketplace scrape through Apify server-side,
 * keeping the API key out of the browser.
 *
 * Body: { query, location?, maxResults?, minYear?, maxPrice?, facebookEmail?, facebookPassword? }
 */
app.post('/api/scrape', async (req, res) => {
  const {
    query,
    location = '',
    radius,
    maxResults = 5,
    minYear,
    minPrice,
    maxPrice,
    minMiles,
    maxMiles,
    facebookEmail: bodyEmail,
    facebookPassword: bodyPassword,
  } = req.body;

  // Fall back to .env credentials if not provided in the request body
  const facebookEmail = bodyEmail || process.env.FACEBOOK_EMAIL || '';
  const facebookPassword = bodyPassword || process.env.FACEBOOK_PASSWORD || '';

  const apiKey =
    process.env.APIFY_API_KEY ||
    process.env.VITE_APIFY_TOKEN ||
    process.env.VITE_apify_token;

  // Actor: maxcopell/facebook-marketplace — well-maintained FB Marketplace scraper
  const actorId = process.env.APIFY_ACTOR_ID || 'maxcopell~facebook-marketplace';

  if (!apiKey) {
    return res.status(500).json({ error: 'APIFY_API_KEY not configured in .env' });
  }
  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const input = {
      search: query,
      location,
      maxItems: Number(maxResults),
      ...(radius && { radius: Number(radius) }),
      ...(minPrice && { minPrice: Number(minPrice) }),
      ...(maxPrice && { maxPrice: Number(maxPrice) }),
      ...(facebookEmail && { facebookEmail }),
      ...(facebookPassword && { facebookPassword }),
    };

    // run-sync-get-dataset-items: starts actor, waits for finish, returns results in one call
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );

    if (!apifyRes.ok) {
      const text = await apifyRes.text();
      return res.status(apifyRes.status).json({ error: `Apify error: ${text}` });
    }

    const items = await apifyRes.json();
    res.json({ items, count: items.length });
  } catch (err) {
    console.error('[server] Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`T1000 API server → http://localhost:${PORT}`);
  // Print LAN IP so you can connect from your phone
  const nets = networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  📱 On your phone → http://${iface.address}:5173`);
      }
    }
  }
});
