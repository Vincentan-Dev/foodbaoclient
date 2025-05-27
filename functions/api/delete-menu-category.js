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
        message: "Method not allowed. Use POST."
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get request data
    const requestData = await request.json();
    const { category_id, username } = requestData;
    
    if (!category_id || !username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required parameters: category_id and username are required"
      }), {
        status: 400,
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

    console.log(`Calling RPC function to delete menu category ${category_id} for user ${username}`);
    
    // Call the delete_menu_category RPC function
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_menu_category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        p_category_id: category_id,
        p_username: username
      })
    });

    // Log response status for debugging
    console.log(`RPC response status: ${response.status}`);
    
    if (!response.ok) {
      // Improved error handling with more detailed response parsing
      let errorMessage = "Unknown error";
      let errorDetails = null;
      
      try {
        // Try to parse as JSON first
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        errorDetails = errorData;
        console.error(`RPC error (${response.status}, JSON):`, errorDetails);
      } catch (parseError) {
        // If not JSON, get as text
        try {
          const errorText = await response.text();
          errorMessage = errorText || `HTTP error: ${response.status}`;
          console.error(`RPC error (${response.status}, Text):`, errorMessage);
        } catch (textError) {
          errorMessage = `Failed to parse error response: ${textError.message}`;
          console.error(errorMessage);
        }
      }
      
      // Special case: If status is 404 or 406 but we're attempting deletion,
      // this might mean the record was already deleted or doesn't exist
      if (response.status === 404 || response.status === 406) {
        return new Response(JSON.stringify({
          success: true,
          message: "Menu category was already deleted or doesn't exist",
          warning: errorMessage
        }), {
          status: 200, // Return 200 anyway since the end result is what the user wanted
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        status: response.status,
        message: `Failed to delete menu category: ${errorMessage}`,
        details: errorDetails
      }), {
        status: 500, // Use 500 to ensure frontend knows there's an error
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Process the successful response
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      // If the response is not JSON (but was successful), treat as success anyway
      return new Response(JSON.stringify({
        success: true,
        message: "Menu category deleted successfully",
        warning: "Could not parse response data"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Menu category deleted successfully",
      result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error deleting menu category:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}