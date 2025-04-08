import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    // Only allow GET
    if (request.method !== "GET") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get username from query string
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username parameter is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check if username exists in app_users
    const checkUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/app_users?username=eq.${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const existingUsers = await checkUserResponse.json();

    // Check if username exists in clients table
    const checkClientResponse = await fetch(
      `${supabaseUrl}/rest/v1/clients?USERNAME=eq.${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const existingClients = await checkClientResponse.json();

    // Return validation result
    return new Response(JSON.stringify({
      success: true,
      username: username,
      exists: existingUsers.length > 0 || existingClients.length > 0,
      existsInAppUsers: existingUsers.length > 0,
      existsInClients: existingClients.length > 0
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error validating username:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}