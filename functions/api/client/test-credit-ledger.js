import { getSupabaseConfig, getCorsHeaders } from '../_supabaseClient.js';

/**
 * Test endpoint for the add_credit_ledger RPC function
 * 
 * This endpoint provides a simple way to test the RPC function
 * without going through the full credit top-up flow
 */
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({
        success: false,
        message: "Configuration error: Missing database credentials"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Only allow POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Parse request body
    let data;
    try {
      data = await request.json();
      console.log('Parsed test request data:', JSON.stringify(data));
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid request body: " + e.message
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    try {
      // Prepare the RPC call params - simple version, require fewer fields
      const rpcParams = {
        p_username: data.username,
        p_amount: parseFloat(data.amount),
        p_description: data.description || "Test credit top-up",
        p_payment_method: data.payment_method || "T", // Test payment method
        p_trans_credit: parseFloat(data.amount),
        p_transaction_type: data.transaction_type || "T", // Test/Top-up
        p_agent: data.agent || "T" // Test agent
      };
      
      console.log('Calling add_credit_ledger RPC with params:', JSON.stringify(rpcParams, null, 2));
      
      // Make the RPC call
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/add_credit_ledger`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(rpcParams)
      });

      // Get the full response text first, before trying to parse as JSON
      const responseText = await rpcResponse.text();
      console.log('Raw RPC response text:', responseText);
      console.log('Response Status:', rpcResponse.status);
      console.log('Response Headers:', Object.fromEntries(rpcResponse.headers.entries()));
      
      // Check if the response is valid
      if (!rpcResponse.ok) {
        return new Response(JSON.stringify({
          success: false,
          message: `RPC call failed with status ${rpcResponse.status}`,
          responseText,
          responseStatus: rpcResponse.status
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Try to parse the response as JSON if it's not empty
      let rpcResult = null;
      if (responseText && responseText.trim() !== '') {
        try {
          rpcResult = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing RPC response as JSON:', parseError);
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid JSON response: ${parseError.message}`,
            responseText,
            responseStatus: rpcResponse.status
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      } else {
        console.warn('Empty response from RPC function');
      }
      
      // Return success response with details
      return new Response(JSON.stringify({
        success: true,
        message: "RPC test completed",
        data: {
          rpcResult,
          responseText: responseText || "(empty)",
          responseStatus: rpcResponse.status,
          requestParams: rpcParams
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      console.error('Error in test endpoint:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "An error occurred during testing",
        error_details: error.toString(),
        stack: error.stack
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Unhandled error in test endpoint:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Unhandled error occurred",
      error_details: error.toString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
