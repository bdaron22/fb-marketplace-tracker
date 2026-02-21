import PocketBase from 'pocketbase';

// When running locally: http://localhost:8090
// When deployed to your server: https://your-server-ip:8090
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

export default pb;
