/**
 * VIN Lookup via NHTSA free public API.
 * https://vpic.nhtsa.dot.gov/api/
 * No API key required.
 */

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

/**
 * Decode a VIN and return a structured object.
 */
export async function decodeVIN(vin) {
  if (!vin || vin.length !== 17) throw new Error('VIN must be exactly 17 characters');

  const res = await fetch(`${NHTSA_BASE}/DecodeVin/${vin}?format=json`);
  if (!res.ok) throw new Error(`NHTSA API error ${res.status}`);

  const data = await res.json();
  const results = data.Results || [];

  const get = (variable) => {
    const item = results.find((r) => r.Variable === variable);
    return item?.Value && item.Value !== 'Not Applicable' ? item.Value : null;
  };

  return {
    vin,
    make: get('Make'),
    model: get('Model'),
    model_year: get('Model Year'),
    body_class: get('Body Class'),
    drive_type: get('Drive Type'),
    engine_cylinders: get('Engine Number of Cylinders'),
    engine_displacement: get('Displacement (L)'),
    fuel_type: get('Fuel Type - Primary'),
    transmission: get('Transmission Style'),
    plant_country: get('Plant Country'),
    series: get('Series'),
    trim: get('Trim'),
    vehicle_type: get('Vehicle Type'),
    manufacturer: get('Manufacturer Name'),
    error_code: get('Error Code'),
    error_text: get('Error Text'),
    raw: results,
  };
}

/**
 * Get all makes for a given year (for dropdowns).
 */
export async function getMakesForYear(year) {
  const res = await fetch(
    `${NHTSA_BASE}/GetMakesForVehicleType/car?format=json`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.Results || []).map((r) => r.MakeName).sort();
}

/**
 * Get models for a given year + make.
 */
export async function getModelsForMakeYear(make, year) {
  const res = await fetch(
    `${NHTSA_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.Results || []).map((r) => r.Model_Name).sort();
}
