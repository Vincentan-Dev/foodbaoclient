import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
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
    
    // Handle different HTTP methods
    if (request.method === "GET") {
      // Fetch all menu items
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?select=*`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error fetching menu items:", errorBody);
        
        return new Response(JSON.stringify({
          success: false,
          message: `Error fetching menu items: ${response.status}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const items = await response.json();
      
      return new Response(JSON.stringify({
        success: true,
        data: items
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else if (request.method === "POST") {
      // Create a new menu item
      const itemData = await request.json();
      
      if (!itemData.NAME || itemData.BASE_PRICE === undefined) {
        return new Response(JSON.stringify({
          success: false,
          message: "Name and price are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Add timestamps
      const now = new Date().toISOString();
      itemData.CREATED_AT = now;
      itemData.UPDATED_AT = now;
      
      // Add created by if not present
      if (!itemData.CREATED_BY) {
        itemData.CREATED_BY = itemData.UPDATED_BY || "system";
      }
      
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(itemData)
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error creating menu item:", errorBody);
        
        return new Response(JSON.stringify({
          success: false,
          message: `Error creating menu item: ${errorBody}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const newItem = await response.json();
      
      return new Response(JSON.stringify({
        success: true,
        message: "Menu item created successfully",
        data: newItem[0] 
      }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // If method is not supported
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Menu items API error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}