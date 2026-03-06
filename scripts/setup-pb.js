#!/usr/bin/env node
/**
 * PocketBase setup script — creates the "leads" collection.
 *
 * Usage (after creating your superuser in the PocketBase dashboard):
 *   node scripts/setup-pb.js <admin-email> <admin-password>
 *
 * Or set env vars and run without args:
 *   PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret node scripts/setup-pb.js
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://falcon-bray.pockethost.io';
const email = process.argv[2] || process.env.PB_ADMIN_EMAIL;
const password = process.argv[3] || process.env.PB_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Usage: node scripts/setup-pb.js <admin-email> <admin-password>');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

async function setup() {
  console.log(`Connecting to PocketBase at ${PB_URL}…`);
  await pb.collection('_superusers').authWithPassword(email, password);
  console.log('Authenticated as superuser.');

  // Check if collection already exists
  const collections = await pb.collections.getFullList();
  const exists = collections.some((c) => c.name === 'leads');
  if (exists) {
    console.log('"leads" collection already exists. Nothing to do.');
    return;
  }

  await pb.collections.create({
    name: 'leads',
    type: 'base',
    fields: [
      { name: 'item_name',       type: 'text',   required: true },
      { name: 'seller',          type: 'text',   required: true },
      { name: 'price',           type: 'number', required: false },
      { name: 'fb_link',         type: 'url',    required: false },
      { name: 'messenger_notes', type: 'text',   required: false },
      { name: 'status',          type: 'text',   required: false },
      { name: 'date_added',      type: 'text',   required: false },
      { name: 'follow_up_date',  type: 'text',   required: false }
    ],
    // Allow all CRUD without auth for a personal/local app.
    // Tighten these rules if you expose PocketBase to the internet.
    listRule:   '',
    viewRule:   '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });

  console.log('"leads" collection created successfully!');
  console.log('You can now start the app with: npm run dev');
}

setup().catch((err) => {
  console.error('Setup failed:', err.message || err);
  process.exit(1);
});
