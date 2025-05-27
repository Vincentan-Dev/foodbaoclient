import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

/**
 * Simple authentication endpoint using the authkey RPC function
 * Supports direct URL access with username parameter
 */
export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders();
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // Support both GET and POST methods
  if (!['GET', 'POST'].includes(request.method)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  try {
    // Get Supabase configuration
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Server configuration error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    let username;
    
    // Get username from request
    if (request.method === 'GET') {
      const url = new URL(request.url);
      username = url.searchParams.get('username');
    } else if (request.method === 'POST') {
      const body = await request.json();
      username = body.username;
    }
    
    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Username is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
      console.log('AuthKey authentication attempt for:', username);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Using service role key:', !!supabaseKey);
    
    // Call the authkey RPC function
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/authkey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        p_username: username
      })
    });
    
    console.log('AuthKey RPC response status:', response.status);
    console.log('AuthKey RPC response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AuthKey RPC error:', errorText);
      console.error('Response status:', response.status);
      console.error('Response statusText:', response.statusText);
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication failed',
        debug: {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const result = await response.json();
    console.log('AuthKey RPC result (raw):', JSON.stringify(result, null, 2));
    console.log('AuthKey RPC result type:', typeof result);
    console.log('AuthKey RPC result keys:', Object.keys(result || {}));
    
    // Check if authentication was successful
    if (result && result.success === true && result.user) {
      // Create a simple token with user data
      const token = btoa(JSON.stringify({
        userId: result.user.ID,
        username: result.user.USERNAME,
        role: result.user.USER_ROLE,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
      }));
      
      console.log('Authentication successful for:', result.user.USERNAME);
      
      return new Response(JSON.stringify({
        success: true,
        user: {
          id: result.user.ID,
          username: result.user.USERNAME,
          email: result.user.EMAIL,
          role: result.user.USER_ROLE
        },
        token: token,
        message: result.message
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: result.message || 'Invalid credentials'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
  } catch (error) {
    console.error('AuthKey endpoint error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Authentication failed',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
