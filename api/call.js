// Vercel serverless function to create web call and return access token
// This keeps the Retell API key secure on the server side

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { agent_id } = req.body;

  // Validate agent_id
  if (!agent_id) {
    return res.status(400).json({ message: 'agent_id is required' });
  }

  // Basic validation - agent IDs start with "agent_"
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

      return res.status(retellResponse.status).json({
        message: errorData.message || 'Failed to create call'
      });
    }

    const data = await retellResponse.json();

    // Return the access token to the frontend
    return res.status(200).json({
      access_token: data.access_token,
      call_id: data.call_id
    });

  } catch (error) {
    console.error('Error creating web call:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
