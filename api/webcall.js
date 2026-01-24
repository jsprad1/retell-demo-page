// Vercel serverless function to create web call
// This keeps the Retell API key secure on the server side

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { agent_id } = req.body;

  // Validate inputs
  if (!agent_id) {
    return res.status(400).json({ message: 'agent_id is required' });
  }

  // Basic validation
  if (!agent_id.startsWith('agent_')) {
    return res.status(400).json({ message: 'Invalid agent_id format' });
  }

  try {
    // Get API key from environment variable
    const apiKey = process.env.RETELL_API_KEY;

    if (!apiKey) {
      console.error('RETELL_API_KEY not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Call Retell API to create web call
    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agent_id
      })
    });

    if (!retellResponse.ok) {
      const errorData = await retellResponse.json().catch(() => ({}));
      console.error('Retell API error:', retellResponse.status, errorData);

      if (retellResponse.status === 404) {
        return res.status(404).json({ message: 'Demo agent not found. This demo may have expired.' });
      }

      if (retellResponse.status === 402) {
        return res.status(402).json({ message: 'Insufficient credits. Please contact support.' });
      }

      return res.status(retellResponse.status).json({
        message: errorData.message || 'Failed to create web call'
      });
    }

    const data = await retellResponse.json();

    // Return the access token needed for web call
    return res.status(200).json({
      success: true,
      access_token: data.access_token,
      call_id: data.call_id
    });

  } catch (error) {
    console.error('Error creating web call:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
