import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // List tables
    const tablesResponse = await fetch(
      `${supabaseUrl}/rest/v1/information_schema/tables?table_schema=eq.public`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!tablesResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: `Error getting tables: ${tablesResponse.status} ${await tablesResponse.text()}`
      }), {
        status: tablesResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const tables = await tablesResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      tables: tables.map(t => t.table_name),
      message: "Schema information retrieved successfully"
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Schema debug error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}