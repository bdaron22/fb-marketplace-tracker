import PocketBase from 'pocketbase';

// Use same origin when served from PocketBase, or explicit URL from env
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || window.location.origin);

export default pb;
