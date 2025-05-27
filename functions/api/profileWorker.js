// File: profileWorker.js (converted to Pages Functions format)
export async function onRequest(context) {
  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  const request = context.request;
  const env = context.env;
  
  // Handle OPTIONS request (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Parse request body
    const body = await request.json();
    const { username } = body;
    
    if (!username) {
      return new Response(JSON.stringify({ 
        error: 'Username is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Get Supabase URL and key from environment variables
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        message: 'Supabase configuration is missing'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Query Supabase for the client info
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/clients?username=eq.${encodeURIComponent(username)}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!supabaseResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Database error',
        status: supabaseResponse.status,
        message: await supabaseResponse.text()
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Parse client data
    const clients = await supabaseResponse.json();
    
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({
        error: 'Not found',
        message: 'No client found with this username'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Return the first matching client
    return new Response(JSON.stringify(clients[0]), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}