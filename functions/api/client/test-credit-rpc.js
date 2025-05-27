/**
 * Test endpoint for the add_credit_ledger RPC function
 * Use this endpoint to verify the Supabase RPC function is working correctly
 */
import { getSupabaseConfig, getCorsHeaders } from '../_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials
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
    
    // Get test parameters from the request
    let testData;
    if (request.method === "POST") {
      testData = await request.json();
    } else {
      // Default test data for GET requests
      testData = {
        p_username: 'test_user',
        p_amount: 10.0,
        p_description: 'Test credit top-up',
        p_payment_method: 'B', // Bank transfer
        p_trans_credit: 10.0,
        p_transaction_type: 'T', // TOP_UP
        p_agent: 'W' // Web
      };
    }
    
    console.log('Testing add_credit_ledger RPC with data:', JSON.stringify(testData, null, 2));
    
    // Make the RPC call
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/add_credit_ledger`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`RPC response status: ${rpcResponse.status}`);
    
    if (rpcResponse.ok) {
      const result = await rpcResponse.json();
      
      return new Response(JSON.stringify({
        success: true,
        message: "RPC call successful",
        result,
        test_data: testData
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else {
      let errorText;
      try {
        errorText = await rpcResponse.text();
      } catch (e) {
        errorText = "Could not read error response";
      }
      
      console.error(`RPC error (${rpcResponse.status}):`, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: "RPC call failed",
        error: errorText,
        status: rpcResponse.status,
        test_data: testData
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error testing add_credit_ledger RPC:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while testing the RPC function"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
