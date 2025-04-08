import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept GET requests
    if (request.method !== "GET") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Only fetch minimal client data (username, businessname)
    const response = await fetch(`${supabaseUrl}/rest/v1/clients?select=USERNAME,BUSINESSNAME,CREDIT_BALANCE&order=BUSINESSNAME.asc`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching clients: ${response.status} - ${errorText}`);
      throw new Error(`Supabase error: ${response.status}`);
    }

    const clients = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: clients
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error("API error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred",
      toast: {
        type: 'error',
        message: error.message || "Operation failed",
        position: 'center'
      }
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
