/**
 * Claude API integration for T1000.
 * Handles:
 *  - Vehicle photo analysis (condition, damage, flags)
 *  - License plate reading
 *  - Offer suggestions
 *  - Feedback-informed vehicle scoring
 */

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

function getApiKey() {
  return (
    import.meta.env.VITE_ANTHROPIC_API_KEY ||
    localStorage.getItem('t1000:anthropic_key') ||
    ''
  );
}

/** Build a Claude image content block from a URL or data URI. */
function buildImageContent(url) {
  if (url.startsWith('data:')) {
    const [header, data] = url.split(',');
    const media_type = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return { type: 'image', source: { type: 'base64', media_type, data } };
  }
  return { type: 'image', source: { type: 'url', url } };
}

/** Strip markdown code fences from a Claude JSON response. */
function cleanJson(text) {
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

async function callClaude({ messages, max_tokens = 1500, system }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Anthropic API key not configured. Add it in Settings.');

  const body = { model: MODEL, max_tokens, messages };
  if (system) body.system = system;

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  return data.content.map((c) => c.text || '').join('').trim();
}

/**
 * Analyze one or more vehicle photos.
 * Returns structured analysis object.
 */
export async function analyzeVehiclePhotos(photoUrls, vehicleInfo = {}) {
  const imageContents = photoUrls.slice(0, 6).map(buildImageContent);

  const vehicleDesc = vehicleInfo.title
    ? `Vehicle: ${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''} – ${vehicleInfo.title}`
    : 'Vehicle details unknown';

  const textContent = {
    type: 'text',
    text: `You are an expert used-car buyer and vehicle inspector. Analyze these vehicle photos for a dealer purchasing agent.

${vehicleDesc}
${vehicleInfo.mileage ? `Mileage: ${vehicleInfo.mileage.toLocaleString()} miles` : ''}

Carefully examine every photo and return ONLY a valid JSON object with this exact structure:
{
  "condition_score": <1-10 integer, 10=pristine>,
  "condition_label": <"Excellent"|"Good"|"Fair"|"Poor">,
  "plate_detected": <true|false>,
  "plate_number": <"STATE XX000X" or null>,
  "plate_state": <state abbreviation or null>,
  "flags": <array of strings from: ["rust", "body_damage", "paint_issues", "flood_signs", "interior_damage", "tire_wear", "frame_damage", "modified", "salvage_signs", "clean"]>,
  "damage_notes": <concise description of visible issues, max 200 chars>,
  "positives": <concise description of good aspects, max 200 chars>,
  "photo_count_analyzed": <number of photos examined>,
  "buy_recommendation": <"strong_buy"|"buy"|"neutral"|"pass"|"strong_pass">,
  "recommendation_reason": <1-2 sentences explaining recommendation>
}

Rules:
- Be specific about damage location (e.g., "rear quarter panel rust")
- If you see a license plate clearly, extract the full plate number and state
- Score conservatively – a 7 is a genuinely good vehicle
- Return ONLY the JSON object, no markdown, no explanation`,
  };

  const text = await callClaude({
    messages: [{ role: 'user', content: [...imageContents, textContent] }],
    max_tokens: 800,
  });

  return JSON.parse(cleanJson(text));
}

/**
 * Read a license plate from a single image.
 */
export async function readLicensePlate(imageUrl) {
  const text = await callClaude({
    messages: [
      {
        role: 'user',
        content: [
          buildImageContent(imageUrl),
          {
            type: 'text',
            text: `Read any visible license plate in this image. Return ONLY a JSON object:
{"found": true, "plate": "ABC1234", "state": "FL"}
or if no plate is visible: {"found": false, "plate": null, "state": null}
Return ONLY JSON, no markdown.`,
          },
        ],
      },
    ],
    max_tokens: 100,
  });

  return JSON.parse(cleanJson(text));
}

/**
 * Generate an offer suggestion based on vehicle data and market context.
 */
export async function generateOfferSuggestion(vehicle, feedbackHistory = []) {
  const goodExamples = feedbackHistory.filter((f) => f.rating === 'good').slice(0, 3);
  const badExamples = feedbackHistory.filter((f) => f.rating === 'bad').slice(0, 3);

  const contextLines = [];
  if (goodExamples.length) {
    contextLines.push('GOOD deals you have made in the past:');
    goodExamples.forEach((f) =>
      contextLines.push(`- ${f.vehicle_title}: paid $${f.offer_price}, reason: ${f.reason || 'good deal'}`)
    );
  }
  if (badExamples.length) {
    contextLines.push('BAD deals or passes you have made:');
    badExamples.forEach((f) =>
      contextLines.push(`- ${f.vehicle_title}: passed at $${f.offer_price}, reason: ${f.reason || 'bad deal'}`)
    );
  }

  const analysis = vehicle.ai_analysis;
  const accutrade = vehicle.accutrade_value;

  const prompt = `You are a savvy used-car dealer advisor. Based on the following data, suggest an offer price and strategy.

VEHICLE:
- Title: ${vehicle.title || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
- Asking Price: $${vehicle.price?.toLocaleString() || 'unknown'}
- Mileage: ${vehicle.mileage?.toLocaleString() || 'unknown'} miles
- Location: ${vehicle.location || 'unknown'}
${accutrade ? `- AccuTrade ACV: $${accutrade.toLocaleString()}` : ''}
${analysis ? `- AI Condition Score: ${analysis.condition_score}/10 (${analysis.condition_label})` : ''}
${analysis?.flags?.length ? `- Issues Found: ${analysis.flags.join(', ')}` : ''}
${analysis?.damage_notes ? `- Damage Notes: ${analysis.damage_notes}` : ''}
${vehicle.vin_data ? `- VIN Decoded: ${vehicle.vin_data.make} ${vehicle.vin_data.model} ${vehicle.vin_data.model_year}` : ''}

${contextLines.length ? contextLines.join('\n') : ''}

Return ONLY a JSON object:
{
  "offer_price": <suggested offer as integer>,
  "offer_range_low": <lowest you should offer>,
  "offer_range_high": <highest reasonable offer>,
  "strategy": <"lowball"|"fair"|"full_ask">,
  "reasoning": <2-3 sentences explaining the offer>,
  "walk_away_price": <price above which you should not buy>,
  "estimated_retail": <estimated retail/flip price>,
  "estimated_profit": <estimated profit if bought at offer price>,
  "red_flags": <array of concern strings, or []>
}`;

  const text = await callClaude({
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    system:
      'You are an expert auto dealer advisor. Always respond with valid JSON only, no markdown formatting.',
  });

  return JSON.parse(cleanJson(text));
}

/**
 * Analyze a screenshot of FB Messenger to extract vehicle leads.
 */
export async function extractLeadsFromScreenshot(base64Image, mediaType = 'image/jpeg') {
  const text = await callClaude({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          {
            type: 'text',
            text: `Analyze this Facebook Messenger screenshot for vehicle purchase leads. Extract and return ONLY a JSON object:
{
  "leads": [
    {
      "title": "YEAR MAKE MODEL",
      "seller_name": "seller name",
      "price": <number or 0>,
      "notes": "key details: condition, mileage, anything important"
    }
  ]
}
Rules: Extract ALL visible vehicle conversations. For title use format YEAR MAKE MODEL. Return ONLY valid JSON.`,
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  return JSON.parse(cleanJson(text));
}
