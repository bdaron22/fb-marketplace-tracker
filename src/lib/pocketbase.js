/**
 * PocketBase integration (optional).
 * If VITE_POCKETBASE_URL is set, vehicles/feedback sync to PocketBase.
 * Collections required:
 *   - autoscout_vehicles
 *   - autoscout_feedback
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

export async function pbUpsertVehicle(vehicle) {
  const client = await getClient();
  if (!client) return null;
  try {
    // Try update first, then create
    const existing = await client
      .collection('autoscout_vehicles')
      .getFirstListItem(`local_id="${vehicle.id}"`)
      .catch(() => null);
    if (existing) {
      return await client.collection('autoscout_vehicles').update(existing.id, {
        ...vehicle,
        local_id: vehicle.id,
      });
    }
    return await client.collection('autoscout_vehicles').create({
      ...vehicle,
      local_id: vehicle.id,
    });
  } catch (err) {
    console.warn('[PocketBase] upsertVehicle error:', err.message);
    return null;
  }
}

export async function pbFetchVehicles() {
  const client = await getClient();
  if (!client) return null;
  try {
    const result = await client.collection('autoscout_vehicles').getList(1, 200, {
      sort: '-created',
    });
    return result.items;
  } catch (err) {
    console.warn('[PocketBase] fetchVehicles error:', err.message);
    return null;
  }
}

export async function pbSaveFeedback(entry) {
  const client = await getClient();
  if (!client) return null;
  try {
    const existing = await client
      .collection('autoscout_feedback')
      .getFirstListItem(`vehicle_id="${entry.vehicle_id}"`)
      .catch(() => null);
    if (existing) {
      return await client.collection('autoscout_feedback').update(existing.id, entry);
    }
    return await client.collection('autoscout_feedback').create(entry);
  } catch (err) {
    console.warn('[PocketBase] saveFeedback error:', err.message);
    return null;
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
