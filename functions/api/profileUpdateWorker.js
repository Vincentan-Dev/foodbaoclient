// File: profileUpdateWorker.js (to be deployed to Cloudflare Workers)
export default {
  async fetch(request, env) {
    // Set up CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      const formData = await request.json();
      const { USERNAME, CLIENT_ID } = formData;
      
      if (!USERNAME || !CLIENT_ID) {
        return new Response(JSON.stringify({ 
          error: 'Username and Client ID are required' 
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
      
      // Add update timestamp
      formData.UPDATED_AT = new Date().toISOString();
      
      // Update user in Supabase
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?CLIENT_ID=eq.${CLIENT_ID}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(formData)
      });
      
      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        return new Response(JSON.stringify({
          error: 'Failed to update profile',
          details: errorText
        }), {
          status: supabaseResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      const updatedClient = await supabaseResponse.json();
      
      // Return the updated client data
      return new Response(JSON.stringify(updatedClient[0] || { success: true }), {
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