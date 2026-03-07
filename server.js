// Local dev API server — wraps Vercel-style api/*.js handlers for Express
import express from 'express';
import { createRequire } from 'module';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json());

// Dynamically load each API handler and mount it
const routes = [
  { path: '/api/scrape',         file: './api/scrape.js' },
  { path: '/api/accutrade',      file: './api/accutrade.js' },
  { path: '/api/detect-plate',   file: './api/detect-plate.js' },
];

for (const { path, file } of routes) {
  const mod = await import(file);
  const handler = mod.default;
  app.all(path, (req, res) => handler(req, res));
}

const PORT = 3001;
app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
