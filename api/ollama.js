/**
 * Vercel Serverless Function: Ollama API Proxy
 * Keeps API key secure on server, never exposed to browser
 */

export default async function handler(req, res) {
  // Lightweight health check to verify function deployment.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'ollama-proxy' })
  }

  // Only allow POST requests for inference.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured: missing OLLAMA_API_KEY' })
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com'
  const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { endpoint, messages, model, temperature } = parsedBody

  if (!endpoint || !messages || !model) {
    return res.status(400).json({ error: 'Missing required fields: endpoint, messages, model' })
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature || 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Ollama error (${response.status}):`, error)
      return res.status(response.status).json({ 
        error: `Ollama request failed: ${response.statusText}`,
        details: error,
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Ollama proxy error:', err)
    return res.status(500).json({ 
      error: 'Failed to reach Ollama service',
      message: err.message,
    })
  }
}
