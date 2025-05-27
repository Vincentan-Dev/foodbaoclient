// filepath: d:\ServiceRun\FBoard\FoodBaoClient\functions\api\debug-schema.js
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

    console.log("Fetching database schema information");

    // Fetch database schema information using introspection
    const schemaResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!schemaResponse.ok) {
      const errorText = await schemaResponse.text();
      console.error(`Error fetching schema: ${schemaResponse.status}`, errorText);
      throw new Error(`Error fetching schema: ${schemaResponse.status}`);
    }

    // Parse the schema information
    const schemaData = await schemaResponse.json();

    // Get table definitions for key tables
    const tableDefinitions = {};
    
    // List of important tables to include in the debug schema
    const importantTables = ["userfile", "clients", "menu_items", "menu_categories", "orders"];
    
    for (const tableName of importantTables) {
      try {
        // Fetch column definitions for each table
        const tableResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=0`, {
          method: "GET",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "count=exact"
          }
        });

        if (tableResponse.ok) {
          // Extract column definitions from response headers
          const rangeDefinition = tableResponse.headers.get("content-range");
          const count = rangeDefinition ? rangeDefinition.split('/')[1] : "unknown";
          
          tableDefinitions[tableName] = {
            count,
            columns: []
          };
          
          // Try to get one record to extract column names
          const sampleResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
            method: "GET",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            }
          });
          
          if (sampleResponse.ok) {
            const sampleData = await sampleResponse.json();
            if (sampleData && sampleData.length > 0) {
              const record = sampleData[0];
              tableDefinitions[tableName].columns = Object.keys(record).map(columnName => {
                const type = typeof record[columnName];
                return { name: columnName, type: type };
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching schema for ${tableName}:`, error);
        tableDefinitions[tableName] = { error: error.message };
      }
    }

    // Return the schema information
    return new Response(JSON.stringify({
      success: true,
      schema: {
        tables: tableDefinitions,
        api_version: "1.0.0",
        database_type: "PostgreSQL"
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("Debug schema error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred",
      error: {
        type: error.name,
        details: error.message
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