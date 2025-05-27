/**
 * Secure Supabase Client Module
 * 
 * Provides consistent access to Supabase credentials across all API endpoints.
 * This file is only accessible server-side and never exposed to the client.
 */
import { createClient } from '@supabase/supabase-js';

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

// Get environment variables in a consistent manner
export function getSupabaseConfig(env) {
  // In Cloudflare Workers, env is passed from the context
  // process.env is not available in Cloudflare Workers
  
  // Get URL from environment
  const supabaseUrl = env?.SUPABASE_URL;
  
  // First try to get service role key (has higher privileges, bypasses RLS)
  // This is important for operations that need to bypass RLS
  const supabaseServiceKey = env?.SUPABASE_SERVICE_ROLE_KEY;
  
  // Fall back to anon key if service key isn't available
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY;
  
  // Use service key if available, otherwise fall back to anon key
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;
  
  // Check for missing critical configuration
  if (!supabaseUrl) {
    console.error('CRITICAL: Missing Supabase URL in environment variables');
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  
  if (!supabaseKey) {
    console.error('CRITICAL: Missing both Supabase service role key and anon key');
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable');
  }
  
  // Debug information to help with troubleshooting
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!supabaseServiceKey);
  
  return {
    supabaseUrl,
    supabaseKey,
    isUsingServiceRole: !!supabaseServiceKey
  };
}

// Export the function to create a Supabase client
export function getSupabase(context) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(context.env);
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create a reusable Supabase fetch function with improved error handling and timeout
export async function supabaseFetch(url, options, env) {
  const { supabaseUrl, supabaseKey, isUsingServiceRole } = getSupabaseConfig(env);
  
  if (!url.startsWith(supabaseUrl)) {
    console.warn(`Request URL ${url} doesn't match configured Supabase URL ${supabaseUrl}`);
  }
  
  // Default headers with authentication
  const headers = {
    ...getSupabaseHeaders(supabaseKey),
    ...(options.headers || {})
  };
  
  // Make the API call with timeout to prevent hanging requests
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000); // 10s default timeout
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error(`Authentication error (${response.status}) accessing Supabase. ${isUsingServiceRole ? 
        'Check service role key validity.' : 
        'Consider using service role key to bypass RLS.'}`);
    }
    
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Supabase API request timed out: ${url}`);
      throw new Error(`Database request timed out after ${options.timeout || 10000}ms`);
    }
    
    console.error(`Supabase API error: ${error.message}`);
    throw error;
  }
}