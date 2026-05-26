// Vercel Serverless Function — proxies requests to Anthropic API
// Keeps the API key server-side (never exposed to browser)

export default async function handler(req, res) {
  // Allow CORS for the app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key is set
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel environment variables.'
    });
  }

  try {
    const { model, max_tokens, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    // Forward to Anthropic
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 8000,
        messages
      })
    });

    const data = await anthropicResponse.json();

    // Forward Anthropic's status code so client can handle errors properly
    return res.status(anthropicResponse.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
