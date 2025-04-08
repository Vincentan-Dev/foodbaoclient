// File: profileWorker.js (to be deployed to Cloudflare Workers)
export default {
  async fetch(request, env) {
    // Set up CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
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
      
      // Verify authorization (optional)
      const authHeader = request.headers.get('Authorization');
      // You can implement token validation here if needed
      
      // Access Supabase environment variables
      const SUPABASE_URL = env.SUPABASE_URL;
      const SUPABASE_KEY = env.SUPABASE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return new Response(JSON.stringify({
          error: 'Supabase configuration missing'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Query Supabase directly with fetch
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?USERNAME=eq.${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      
      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        return new Response(JSON.stringify({
          error: 'Supabase query failed',
          details: errorText
        }), {
          status: supabaseResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      const clients = await supabaseResponse.json();
      
      // Check if user was found
      if (!clients || clients.length === 0) {
        return new Response(JSON.stringify({
          error: 'User not found'
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
};