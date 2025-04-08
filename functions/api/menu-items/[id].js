export async function onRequest(context) {
  try {
    const { request, params, env } = context;
    const menuItemId = params.id;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Get Supabase credentials
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!menuItemId) {
      return new Response(JSON.stringify({
        success: false,
        message: "Menu item ID is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle different HTTP methods
    if (request.method === "GET") {
      // Fetch a single menu item
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${menuItemId}&select=*`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error fetching menu item:", errorBody);
        
        return new Response(JSON.stringify({
          success: false,
          message: `Error fetching menu item: ${response.status}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const items = await response.json();
      
      if (!items || items.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Menu item not found"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: items[0]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else if (request.method === "PUT") {
      // Update a menu item
      const itemData = await request.json();
      
      if (!itemData.NAME) {
        return new Response(JSON.stringify({
          success: false,
          message: "Name is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Update timestamp
      itemData.UPDATED_AT = new Date().toISOString();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${menuItemId}`, {
        method: "PATCH",
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
        console.error("Error updating menu item:", errorBody);
        
        return new Response(JSON.stringify({
          success: false,
          message: `Error updating menu item: ${errorBody}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const updatedItem = await response.json();
      
      if (!updatedItem || updatedItem.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Menu item not found or not updated"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Menu item updated successfully",
        data: updatedItem[0]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else if (request.method === "DELETE") {
      // Delete a menu item
      console.log(`Deleting menu item with ID: ${menuItemId}`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${menuItemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error deleting menu item:", errorBody);
        
        return new Response(JSON.stringify({
          success: false,
          message: `Error deleting menu item: ${errorBody}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Menu item deleted successfully"
      }), {
        status: 200,
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
    console.error("Menu item API error:", error);
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