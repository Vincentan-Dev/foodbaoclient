export default async function handler(req, res) {
  try {
    const targetUrl = req.query.url || req.query.path;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target URL' });
    }
    
    // Get request details
    const method = req.method;
    const headers = { ...req.headers };
    
    // Remove host-specific headers
    delete headers.host;
    delete headers.connection;
    
    // Prepare fetch options
    const fetchOptions = {
      method,
      headers,
      redirect: 'follow',
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    // Execute proxy request
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    
    // Copy status and headers
    res.status(response.status);
    
    for (const [key, value] of Object.entries(response.headers.raw())) {
      res.setHeader(key, value);
    }
    
    // Send response
    return res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}