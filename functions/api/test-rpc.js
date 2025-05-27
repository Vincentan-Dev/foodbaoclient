// filepath: d:\ServiceRun\FBoard\FoodBaoClient\functions\api\test-rpc.js
import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

// Helper function to log the progress with timestamps
function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[TEST-RPC ${timestamp}] ${message}`);
  if (data) {
    console.log(data);
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders();
  
  // Handle OPTIONS request for CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const url = new URL(request.url);
    
    // This endpoint should only be used in testing/development environments
    const isProd = url.hostname.includes('foodbaoclient.pages.dev');
    
    if (isProd && !url.searchParams.get('force') === 'true') {
      return new Response(JSON.stringify({
        success: false,
        message: "This testing endpoint is disabled in production. Add ?force=true to override."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get Supabase credentials
    const { supabaseUrl, supabaseKey, isUsingServiceRole } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Supabase configuration missing",
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          isUsingServiceRole
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Log configuration (without exposing full credentials)
    logDebug('Testing RPC with configuration', {
      supabaseUrl: supabaseUrl.substring(0, 20) + '...',
      keyLength: supabaseKey.length,
      isUsingServiceRole
    });
    
    let functionName, params;
    
    // Get test parameters from query or body
    if (request.method === "GET") {
      functionName = url.searchParams.get('function') || 'verify_password';
      
      // For GET requests, provide a default test for verify_password
      if (functionName === 'verify_password') {
        // Default test hash (this is just an example, won't work with real passwords)
        const testHash = url.searchParams.get('hash') || '$2a$10$abcdefghijklmnopqrstuv';
        const testPassword = url.searchParams.get('password') || 'test_password';
        
        params = {
          stored_hash: testHash,
          user_password: testPassword
        };
      } else {
        params = {}; // Default empty params for other functions
      }
    } else {
      // For POST requests, get function name and params from body
      const body = await request.json();
      functionName = body.function || 'verify_password';
      params = body.params || {};
    }
    
    logDebug(`Testing RPC function: ${functionName}`, {
      params_keys: Object.keys(params),
      method: request.method
    });
    
    // Call the RPC function directly with proper authorization headers
    try {
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(params)
      });
      
      logDebug(`RPC response status: ${rpcResponse.status}`);
      
      // Handle response
      if (rpcResponse.ok) {
        const result = await rpcResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          function: functionName,
          result,
          status: rpcResponse.status
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        // Try to parse error details
        let errorText;
        try {
          errorText = await rpcResponse.text();
        } catch (e) {
          errorText = "Could not read error response";
        }
        
        logDebug(`RPC error (${rpcResponse.status})`, { error: errorText });
        
        return new Response(JSON.stringify({
          success: false,
          function: functionName,
          error: errorText,
          status: rpcResponse.status,
          requestHeaders: {
            contentType: 'application/json',
            authPrefix: 'Bearer',
            hasApiKey: !!supabaseKey,
            apiKeyLength: supabaseKey ? supabaseKey.length : 0
          }
        }), {
          status: rpcResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (fetchError) {
      logDebug('Error making RPC request', {
        message: fetchError.message,
        stack: fetchError.stack
      });
      
      return new Response(JSON.stringify({
        success: false,
        function: functionName,
        error: `Failed to make RPC request: ${fetchError.message}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    logDebug('General error in test-rpc endpoint', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: `Test RPC endpoint error: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}