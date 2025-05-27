// File: profileUpdateWorker.js (converted to Pages Functions format)
export async function onRequest(context) {
  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
    // Only accept PUT requests
    if (request.method !== 'PUT') {
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
    const { id, profileData } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Client ID is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    if (!profileData || typeof profileData !== 'object') {
      return new Response(JSON.stringify({ 
        error: 'Profile data is required and must be an object' 
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
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    
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
    
    // Update the client profile in Supabase
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
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
    
    // Return the updated client data
    const updatedClient = await supabaseResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Profile updated successfully',
      data: updatedClient[0]
    }), {
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