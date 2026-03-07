// Vercel serverless function — POST /api/accutrade
// Fetches vehicle market value from AccuTrade's API.
//
// AccuTrade API docs: https://developer.accutrade.com
// You'll need dealer/partner credentials from AccuTrade to use this.
//
// If you don't have AccuTrade access yet, this returns an estimated
// market value based on the vehicle info as a placeholder.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year, make, model, mileage, zip } = req.body || {};

  const apiKey = process.env.ACCUTRADE_API_KEY;
  const apiUrl = process.env.ACCUTRADE_API_URL || 'https://api.accutrade.com/v1';

  // ── If AccuTrade API key is configured, use their API ─────────────────────
  if (apiKey) {
    try {
      const response = await fetch(`${apiUrl}/appraisal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          year: year || extractYear(title),
          make: make || extractMake(title),
          model: model || extractModel(title),
          mileage: mileage || 0,
          zip: zip || '00000',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AccuTrade API error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      // Normalize AccuTrade response to our format
      return res.status(200).json({
        value: data.auctionValue || data.tradeInValue || data.retailValue || null,
        auctionValue: data.auctionValue || null,
        retailValue: data.retailValue || null,
        tradeInValue: data.tradeInValue || null,
        condition: data.condition || 'average',
        source: 'accutrade',
      });
    } catch (err) {
      console.error('AccuTrade API error:', err);
      // Fall through to estimate below
    }
  }

  // ── Fallback: rough market estimate ──────────────────────────────────────
  // This is a placeholder until you connect the real AccuTrade API.
  // It uses very rough depreciation math — NOT for actual purchasing decisions.
  const vehicleYear = year || extractYear(title) || new Date().getFullYear() - 5;
  const age = new Date().getFullYear() - vehicleYear;
  const baseMSRP = estimateBaseMSRP(make || extractMake(title));
  const depreciatedValue = Math.round(baseMSRP * Math.pow(0.85, age));
  const mileageAdjustment = mileage ? Math.round((mileage - 75000) * -0.02) : 0;
  const estimatedValue = Math.max(500, depreciatedValue + mileageAdjustment);

  return res.status(200).json({
    value: estimatedValue,
    auctionValue: Math.round(estimatedValue * 0.88),
    retailValue: Math.round(estimatedValue * 1.08),
    tradeInValue: Math.round(estimatedValue * 0.92),
    condition: 'average',
    source: 'estimate',
    note: 'AccuTrade API not configured — using rough estimate. Set ACCUTRADE_API_KEY in .env.local.',
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractYear(text = '') {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

function extractMake(text = '') {
  const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Dodge', 'Nissan',
    'Hyundai', 'Kia', 'Subaru', 'Jeep', 'Ram', 'GMC', 'BMW', 'Mercedes', 'Audi',
    'Volkswagen', 'Mazda', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Buick',
    'Chrysler', 'Mitsubishi', 'Volvo', 'Land Rover', 'Porsche', 'Tesla'];
  for (const make of makes) {
    if (text.toLowerCase().includes(make.toLowerCase())) return make;
  }
  return '';
}

function extractModel(text = '') {
  // Very rough — just grab the third word after the year and make
  const words = text.replace(/\b(19|20)\d{2}\b/, '').trim().split(/\s+/);
  return words.slice(1).join(' ').split(/\s+/).slice(0, 2).join(' ');
}

function estimateBaseMSRP(make = '') {
  const msrpMap = {
    'Tesla': 55000, 'BMW': 50000, 'Mercedes': 52000, 'Audi': 48000,
    'Lexus': 44000, 'Porsche': 80000, 'Land Rover': 60000,
    'Cadillac': 46000, 'Acura': 38000, 'Infiniti': 40000, 'Volvo': 46000,
    'Toyota': 32000, 'Honda': 28000, 'Subaru': 30000, 'Mazda': 28000,
    'Ford': 34000, 'Chevrolet': 33000, 'Chevy': 33000, 'GMC': 38000,
    'Dodge': 32000, 'Ram': 40000, 'Jeep': 38000, 'Chrysler': 35000,
    'Buick': 36000,
    'Nissan': 28000, 'Hyundai': 26000, 'Kia': 25000, 'Mitsubishi': 24000,
    'Volkswagen': 30000,
  };
  return msrpMap[make] || 30000;
}
