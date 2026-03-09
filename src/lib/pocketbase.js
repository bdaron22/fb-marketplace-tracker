/**
 * PocketBase integration.
 * Collection schema (t1000_vehicles):
 *   - local_id: text (required, unique index recommended)
 *   - data:     json (required) — stores the full vehicle object
 *
 * If VITE_POCKETBASE_URL is not set, all functions return null/false.
 */

let pb = null;

async function getClient() {
  if (pb) return pb;
  const url = import.meta.env.VITE_POCKETBASE_URL;
  if (!url) return null;
  try {
    const { default: PocketBase } = await import('pocketbase');
    pb = new PocketBase(url);
    return pb;
  } catch {
    return null;
  }
}

export async function pbFetchVehicles() {
  const client = await getClient();
  if (!client) return null;
  try {
    const result = await client.collection('t1000_vehicles').getList(1, 500, {
      sort: '-created',
    });
    return result.items.map((r) => r.data);
  } catch (err) {
    console.warn('[PocketBase] fetchVehicles error:', err.message);
    return null;
  }
}

export async function pbUpsertVehicle(vehicle) {
  const client = await getClient();
  if (!client) return null;
  try {
    const existing = await client
      .collection('t1000_vehicles')
      .getFirstListItem(`local_id="${vehicle.id}"`)
      .catch(() => null);
    const payload = { local_id: vehicle.id, data: vehicle };
    if (existing) {
      return await client.collection('t1000_vehicles').update(existing.id, payload);
    }
    return await client.collection('t1000_vehicles').create(payload);
  } catch (err) {
    console.warn('[PocketBase] upsertVehicle error:', err.message);
    return null;
  }
}

export async function pbDeleteVehicle(id) {
  const client = await getClient();
  if (!client) return false;
  try {
    const existing = await client
      .collection('t1000_vehicles')
      .getFirstListItem(`local_id="${id}"`)
      .catch(() => null);
    if (existing) {
      await client.collection('t1000_vehicles').delete(existing.id);
    }
    return true;
  } catch (err) {
    console.warn('[PocketBase] deleteVehicle error:', err.message);
    return false;
  }
}

export async function testPocketBaseConnection(url) {
  try {
    const { default: PocketBase } = await import('pocketbase');
    const client = new PocketBase(url);
    const health = await client.health.check();
    return { ok: true, health };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
