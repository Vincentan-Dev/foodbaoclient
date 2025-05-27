import { getSupabaseConfig, getCorsHeaders, getSupabase } from './_supabaseClient.js';

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
    const supabase = getSupabase(context);
    
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
      
      // Set the USERNAME field from CREATED_BY or UPDATED_BY
      if (itemData.CREATED_BY) {
        itemData.USERNAME = itemData.CREATED_BY;
      } else if (itemData.UPDATED_BY) {
        itemData.USERNAME = itemData.UPDATED_BY;
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
    } else if (request.method === "PUT") {
      // Update an existing menu item
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || isNaN(parseInt(id))) {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid item ID"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const itemData = await request.json();
      
      // Update timestamps
      itemData.UPDATED_AT = new Date().toISOString();
      
      // Set USERNAME field from UPDATED_BY if provided
      if (itemData.UPDATED_BY) {
        itemData.USERNAME = itemData.UPDATED_BY;
      }
      
      // First verify that the item exists
      const checkResponse = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      const existingItems = await checkResponse.json();
      
      if (!existingItems || existingItems.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Menu item not found"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // If the item exists, proceed with the update
      const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${id}`, {
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
          message: `Error updating menu item: ${response.status}`
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const updatedItem = await response.json();
      
      // Check if any items were actually updated
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
      // Delete a menu item with cascading deletion
      // Parse item ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || isNaN(parseInt(id))) {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid item ID"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      console.log(`Processing deletion for menu item with ID: ${id}`);
      
      try {
        // Step 1: Check and delete from menu_item_variations junction table first
        console.log(`Step 1: Checking and deleting from menu_item_variations where ITEM_ID=${id}`);
        const { data: variationMappings, error: mappingsError } = await supabase
          .from('menu_item_variations')
          .delete()
          .eq('ITEM_ID', id)
          .select();
        
        if (mappingsError) {
          console.error(`Error deleting from menu_item_variations: ${mappingsError.message}`);
          // Continue with deletion flow even if this fails
        } else {
          console.log(`Deleted ${variationMappings?.length || 0} records from menu_item_variations`);
        }
        
        // Step 2: Check and delete from item_variations table if necessary
        console.log(`Step 2: Checking for any item variations tied to this ITEM_ID=${id}`);
        
        // Check if the ITEM_ID exists in the item_variations table
        const { data: itemVariations, error: checkError } = await supabase
          .from('item_variations')
          .select('*')
          .eq('ITEM_ID', id);
        
        if (checkError) {
          console.error(`Error checking item_variations: ${checkError.message}`);
          // Continue with deletion flow even if this check fails
        } else if (itemVariations && itemVariations.length > 0) {
          console.log(`Found ${itemVariations.length} records in item_variations to delete`);
          
          // Delete the variations tied to this item
          const { data: deletedVariations, error: variationsDeleteError } = await supabase
            .from('item_variations')
            .delete()
            .eq('ITEM_ID', id)
            .select();
            
          if (variationsDeleteError) {
            console.error(`Error deleting from item_variations: ${variationsDeleteError.message}`);
            // Continue with deletion flow even if this fails
          } else {
            console.log(`Successfully deleted ${deletedVariations?.length || 0} variations from item_variations`);
          }
        } else {
          console.log('No records found in item_variations for this item');
        }
        
        // Step 3: Finally delete the menu item
        console.log(`Step 3: Deleting menu item with ID=${id}`);
        const { data: deletedItem, error: deleteError } = await supabase
          .from('menu_items')
          .delete()
          .eq('ITEM_ID', id)
          .select();
        
        if (deleteError) {
          console.error(`Error deleting menu item: ${deleteError.message}`);
          return new Response(JSON.stringify({
            success: false,
            message: `Error deleting menu item: ${deleteError.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // If no records were deleted, item might not exist
        if (!deletedItem || deletedItem.length === 0) {
          // Check if the item still exists (which would indicate deletion failed)
          const { data: existingItem } = await supabase
            .from('menu_items')
            .select('*')
            .eq('ITEM_ID', id)
            .single();
            
          if (existingItem) {
            console.error(`Menu item ${id} still exists after deletion attempt`);
            // Force delete without using RPC
            const forceDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/menu_items?ITEM_ID=eq.${id}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Prefer": "return=representation"
              }
            });
            
            if (!forceDeleteResponse.ok) {
              return new Response(JSON.stringify({
                success: false,
                message: "Failed to delete menu item after multiple attempts"
              }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            }
            
            console.log(`Successfully forced deletion of menu item ${id}`);
          } else {
            // Item genuinely doesn't exist
            return new Response(JSON.stringify({
              success: false,
              message: "Menu item not found"
            }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: "Menu item and related records deleted successfully",
          data: {
            deletedItem: deletedItem?.[0] || { ITEM_ID: parseInt(id) },
            variationMappingsRemoved: variationMappings?.length || 0,
            itemVariationsRemoved: itemVariations?.length || 0
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
        
      } catch (deleteError) {
        console.error("Error in delete cascade process:", deleteError);
        return new Response(JSON.stringify({
          success: false,
          message: `Error during deletion process: ${deleteError.message}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
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