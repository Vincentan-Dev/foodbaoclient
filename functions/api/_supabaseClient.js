/**
 * Secure Supabase Client Module
 * 
 * Provides consistent access to Supabase credentials across all API endpoints.
 * This file is only accessible server-side and never exposed to the client.
 */

// Standard headers for Supabase API calls
export function getSupabaseHeaders(supabaseKey) {
  return {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
  };
}

// CORS headers for API responses
export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

// Get environment variables in a consistent manner
export function getSupabaseConfig(env) {
  // Support both naming conventions seen in your codebase
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration. Check environment variables.");
  }
  
  return {
    supabaseUrl,
    supabaseKey
  };
}

// Create a reusable Supabase fetch function
export async function supabaseFetch(url, options, env) {
  const { supabaseKey } = getSupabaseConfig(env);
  
  // Default headers with authentication
  const headers = {
    ...getSupabaseHeaders(supabaseKey),
    ...(options.headers || {})
  };
  
  // Make the API call
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    return response;
  } catch (error) {
    console.error(`Supabase API error: ${error.message}`);
    throw error;
  }
}