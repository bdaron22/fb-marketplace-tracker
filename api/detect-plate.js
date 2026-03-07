// Vercel serverless function — POST /api/detect-plate
// Uses Claude's vision API to detect license plate numbers in vehicle photos.

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body || {};
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Look at this vehicle photo and find any visible license plate.

If you can see a license plate, respond with ONLY the plate number/text in this exact format:
PLATE: ABC1234

If you cannot see any license plate or it is obscured/unreadable, respond with exactly:
PLATE: NOT_VISIBLE

Do not include any other text in your response.`,
            },
          ],
        },
      ],
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    const match = text.match(/PLATE:\s*([A-Z0-9\s\-]+)/i);
    if (match) {
      const plateValue = match[1].trim();
      if (plateValue === 'NOT_VISIBLE') {
        return res.status(200).json({ plate: null, message: 'No plate visible' });
      }
      return res.status(200).json({ plate: plateValue });
    }

    return res.status(200).json({ plate: null, message: 'Could not parse response' });
  } catch (err) {
    console.error('Plate detection error:', err);
    return res.status(500).json({ error: err.message || 'Detection failed' });
  }
}
