import express from 'express';
import { config } from 'dotenv';

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
    maxResults = 50,
    minYear,
    maxPrice,
    facebookEmail,
    facebookPassword,
  } = req.body;

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
app.listen(PORT, () => {
  console.log(`T1000 API server → http://localhost:${PORT}`);
});
