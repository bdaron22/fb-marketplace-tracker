// Local dev API server — wraps Vercel-style api/*.js handlers for Express
import express from 'express';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load .env.local with explicit UTF-8 encoding to handle Windows file encoding issues
try {
  const envFile = readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''); // strip BOM if present
  const result = dotenv.parse(envFile);
  for (const [key, value] of Object.entries(result)) {
    process.env[key] = value;
  }
  console.log(`[env] Loaded ${Object.keys(result).length} vars from .env.local`);
} catch (e) {
  console.warn('[env] No .env.local found or could not read it:', e.message);
}

const app = express();
app.use(express.json());

// Dynamically load each API handler and mount it
const routes = [
  { path: '/api/scrape',         file: './api/scrape.js' },
  { path: '/api/accutrade',      file: './api/accutrade.js' },
  { path: '/api/detect-plate',   file: './api/detect-plate.js' },
];

for (const { path, file } of routes) {
  try {
    const mod = await import(file);
    const handler = mod.default;
    app.all(path, (req, res) => handler(req, res));
    console.log(`[route] Mounted ${path}`);
  } catch (err) {
    console.error(`[route] Failed to load ${file}:`, err.message);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`[server] API server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('[server] Failed to start:', err.message);
});
