import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get request data
    const requestData = await request.json();
    const { function_name, params } = requestData;
    
    if (!function_name) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing function_name parameter"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Server configuration error: Missing Supabase API key"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`Calling RPC function: ${function_name}`);
    console.log(`Using Supabase URL: ${supabaseUrl.substring(0, 20)}...`);
    console.log(`API Key length: ${supabaseKey.length} characters`);
    
    // Special handling for delete operations to provide better logging
    if (function_name.toLowerCase().includes('delete')) {
      console.log(`Delete operation detected: ${function_name}`, params);
    }
    
    // Call Supabase RPC endpoint with explicit authorization headers
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${function_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(params || {})
    });

    // Log response status for debugging
    console.log(`RPC response status: ${response.status}`);
    
    if (!response.ok) {
      // Improved error handling with detailed logging
      let errorResponse;
      try {
        // Try to parse error as JSON
        errorResponse = await response.json();
        console.error(`RPC JSON error (${response.status}):`, errorResponse);
      } catch (e) {
        // If not JSON, get the error as text
        try {
          errorResponse = await response.text();
          console.error(`RPC text error (${response.status}):`, errorResponse);
        } catch (textError) {
          errorResponse = "Failed to parse error response";
          console.error(`Failed to parse error response: ${textError.message}`);
        }
      }
      
      // Special case: For delete operations that return 204 or empty responses
      // These might be successful operations even though they return no content
      if (function_name.toLowerCase().includes('delete')) {
        if (response.status === 204 || 
            (response.status === 200 && (!errorResponse || errorResponse === '')) ||
            response.status === 404) {
          
          console.log(`Delete operation appears successful despite error status: ${response.status}`);
          
          // For these cases, treat as success
          return new Response(JSON.stringify({
            success: true,
            message: `${function_name} operation completed`,
            result: { deleted: true }
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: false,
        status: response.status,
        error: errorResponse
      }), {
        status: 500, // Send 500 to the client to indicate a server error
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // For successful responses, try to parse JSON but handle empty responses too
    let result;
    try {
      // Try to parse the response as JSON
      const text = await response.text();
      
      // Special handling for empty responses, which are common for delete operations
      if (!text || text.trim() === '') {
        console.log(`RPC returned empty response body for ${function_name} - treating as success`);
        result = { success: true };
      } else {
        result = JSON.parse(text);
      }
    } catch (parseError) {
      console.error(`Error parsing RPC response: ${parseError.message}`);
      
      // For delete operations, treat parse errors as success (likely empty response)
      if (function_name.toLowerCase().includes('delete')) {
        return new Response(JSON.stringify({
          success: true,
          message: `${function_name} operation completed`,
          result: { deleted: true }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // For other operations, report the parse error
      return new Response(JSON.stringify({
        success: false,
        message: `Error parsing RPC response: ${parseError.message}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200, // Always return 200 for successful operations
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error in RPC call:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}