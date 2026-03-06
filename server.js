import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
app.use(express.json());

// POST /api/scrape — run Apify Facebook Marketplace actor and return listings
app.post('/api/scrape', async (req, res) => {
  const { query, location = '', maxItems = 20 } = req.body;

  const apiKey = process.env.APIFY_API_KEY;
  // Default actor: maxcopell/facebook-marketplace (popular FB Marketplace scraper on Apify)
  // Override with APIFY_ACTOR_ID env var if you prefer a different actor
  const actorId = (process.env.APIFY_ACTOR_ID || 'maxcopell~facebook-marketplace');

  if (!apiKey) {
    return res.status(500).json({ error: 'APIFY_API_KEY not configured in .env' });
  }
  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    // run-sync-get-dataset-items starts the actor, waits for it, and returns dataset items in one call
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: query,
          location,
          maxItems: Number(maxItems),
          // Pass Facebook credentials so Apify can log in and see all listings
          facebookEmail: process.env.FACEBOOK_EMAIL || '',
          facebookPassword: process.env.FACEBOOK_PASSWORD || '',
        }),
      }
    );

    if (!apifyRes.ok) {
      const text = await apifyRes.text();
      return res.status(apifyRes.status).json({ error: `Apify error: ${text}` });
    }

    const items = await apifyRes.json();
    res.json({ items });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
