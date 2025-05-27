import { getSupabaseConfig, getCorsHeaders } from '../_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
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
    
    // Get username from URL query parameters
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    
    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Fetching credit history for username: ${username}`);
    
    // Attempt to fetch history directly from credit_ledgers using username
    console.log(`Querying credit_ledgers table by username: ${username}`);
    const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers?username=eq.${encodeURIComponent(username)}&order=transaction_date.desc`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    let ledgerEntries = [];
    if (ledgerResponse.ok) {
      ledgerEntries = await ledgerResponse.json();
      console.log(`Found ${ledgerEntries.length} credit history entries for username: ${username}`);
      
      if (ledgerEntries.length > 0) {
        return new Response(JSON.stringify(ledgerEntries), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } else {
      console.error(`Error fetching from credit_ledgers by username: ${ledgerResponse.status}`);
    }
    
    // If no direct match was found, try case-insensitive search
    console.log(`Trying case-insensitive search in credit_ledgers for username: ${username}`);
    const insensitiveResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers?username=ilike.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (insensitiveResponse.ok) {
      const insensitiveEntries = await insensitiveResponse.json();
      if (insensitiveEntries.length > 0) {
        console.log(`Found ${insensitiveEntries.length} credit history entries with case-insensitive search`);
        return new Response(JSON.stringify(insensitiveEntries), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    // If still no entries found, return empty list with 200 status (not an error)
    console.log('No credit history found for username:', username);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while fetching credit history"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}