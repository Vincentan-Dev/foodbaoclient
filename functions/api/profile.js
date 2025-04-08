import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  console.log('Profile function called - DEBUG');
  try {
    const { request, env } = context;
    console.log('Request method:', request.method, 'URL:', request.url);
    
    // Set CORS headers for all responses
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Accept both GET and POST for flexibility
    if (request.method !== "POST" && request.method !== "GET") {
      console.log('Method not allowed:', request.method);
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get Supabase credentials
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Supabase Key available:', supabaseKey ? "Yes" : "No");
    
    let username;
    
    // Extract username from request based on method
    if (request.method === "POST") {
      try {
        // Try to parse JSON body
        const body = await request.json();
        username = body.username;
        console.log('Username from POST body:', username);
      } catch (error) {
        console.error('Error parsing JSON body:', error);
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid JSON body"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } else {
      // For GET requests, try to get username from query string
      const url = new URL(request.url);
      username = url.searchParams.get('username');
      console.log('Username from URL params:', username);
    }

    // Validate username
    if (!username) {
      console.log('Username is required');
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("Fetching profile for username:", username);

    // Get user details from the userfile table
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}&select=*`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Supabase error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user: ${userResponse.status}`
      }), {
        status: userResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const users = await userResponse.json();

    if (!users || users.length === 0) {
      console.log('User not found - DEBUG');
      return new Response(JSON.stringify({
        success: false,
        message: "User not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const user = users[0];

    // Return the user profile data
    return new Response(JSON.stringify({
      success: true,
      message: "Profile retrieved successfully",
      data: user
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("Profile retrieval error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}