export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the refresh token from the request
    const requestData = await request.json();
    const refreshToken = requestData.refresh_token;
    
    if (!refreshToken) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No refresh token provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get Supabase credentials
    const supabaseUrl = env.SUPABASE_URL || "https://icqbjfixyidhhrpnekdl.supabase.co";
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase API key in server configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Call Supabase Auth API to refresh the token
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      token: result.access_token,
      refresh_token: result.refresh_token, // Optional: provide new refresh token
      expires_at: result.expires_at
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error refreshing token: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}