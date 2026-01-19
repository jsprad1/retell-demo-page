// Vercel serverless function to create outbound phone call
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

  const { agent_id, phone_number } = req.body;

  // Validate inputs
  if (!agent_id) {
    return res.status(400).json({ message: 'agent_id is required' });
  }

  if (!phone_number) {
    return res.status(400).json({ message: 'phone_number is required' });
  }

  // Basic validation
  if (!agent_id.startsWith('agent_')) {
    return res.status(400).json({ message: 'Invalid agent_id format' });
  }

  // Validate phone number format (E.164)
  if (!phone_number.match(/^\+1\d{10}$/)) {
    return res.status(400).json({ message: 'Invalid phone number format. Use +1XXXXXXXXXX' });
  }

  try {
    // Get API key from environment variable
    const apiKey = process.env.RETELL_API_KEY;

    if (!apiKey) {
      console.error('RETELL_API_KEY not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Call Retell API to create outbound phone call
    const retellResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from_number: '+17722053109',
        to_number: phone_number,
        override_agent_id: agent_id
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
        message: errorData.message || 'Failed to place call'
      });
    }

    const data = await retellResponse.json();

    // Return success
    return res.status(200).json({
      success: true,
      call_id: data.call_id
    });

  } catch (error) {
    console.error('Error creating phone call:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
