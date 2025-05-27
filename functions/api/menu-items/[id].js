import { getCorsHeaders, getSupabase } from '../_supabaseClient.js';

export async function onRequest(context) {
  const { request, params } = context;
  const id = params.id;
  const corsHeaders = getCorsHeaders();

  // Return OPTIONS request for CORS with proper headers
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = getSupabase(context);

  // Handle DELETE request
  if (request.method === "DELETE") {
    try {
      console.log(`Processing delete request for menu item ID: ${id}`);

      // 1. First, delete all related variations from the junction table
      console.log(`Deleting related variations from menu_item_variations for item ID: ${id}`);
      const { error: variationsError } = await supabase
        .from('menu_item_variations')
        .delete()
        .eq('ITEM_ID', id);

      if (variationsError) {
        console.error('Error deleting related variations:', variationsError);
        // Continue with item deletion even if variation deletion fails
        // We log the error but don't stop the process
      }

      // 2. Now delete the menu item itself
      console.log(`Deleting menu item with ID: ${id}`);
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('ITEM_ID', id);

      if (deleteError) {
        console.error('Error deleting menu item:', deleteError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to delete menu item: ${deleteError.message}`
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }

      // Success response
      return new Response(
        JSON.stringify({
          success: true,
          message: "Menu item deleted successfully"
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    } catch (error) {
      console.error('Unhandled error during deletion:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Server error: ${error.message}`
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
  }

  // Handle GET request
  if (request.method === "GET") {
    try {
      const response = await supabase
        .from('menu_items')
        .select('*')
        .eq('ITEM_ID', id);

      if (response.error) {
        console.error("Error fetching menu item:", response.error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error fetching menu item: ${response.error.message}`
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      const items = response.data;

      if (!items || items.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Menu item not found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: items[0]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    } catch (error) {
      console.error("Menu item API error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "An unexpected error occurred"
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }

  // Handle PUT request
  if (request.method === "PUT") {
    try {
      const itemData = await request.json();
      console.log(`Processing update request for menu item ID: ${id}`, itemData);

      if (!itemData.NAME) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Name is required"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Update timestamp
      itemData.UPDATED_AT = new Date().toISOString();

      // Set USERNAME field from UPDATED_BY if provided
      if (itemData.UPDATED_BY) {
        itemData.USERNAME = itemData.UPDATED_BY;
      }

      // First verify the item exists
      const { data: existingItem, error: checkError } = await supabase
        .from('menu_items')
        .select('ITEM_ID')
        .eq('ITEM_ID', id)
        .single();

      if (checkError || !existingItem) {
        console.error("Item not found during pre-update check:", checkError || "No data returned");
        return new Response(
          JSON.stringify({
            success: false,
            message: "Menu item not found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      console.log(`Updating menu item with ID: ${id}`);
      
      // Perform the update
      const { error: updateError } = await supabase
        .from('menu_items')
        .update(itemData)
        .eq('ITEM_ID', id);

      if (updateError) {
        console.error("Error updating menu item:", updateError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error updating menu item: ${updateError.message}`
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Fetch the updated item to return in the response
      const { data: updatedItem, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('ITEM_ID', id)
        .single();

      if (fetchError) {
        console.error("Error fetching updated item:", fetchError);
        // Even though fetch failed, the update was successful
        return new Response(
          JSON.stringify({
            success: true,
            message: "Menu item updated successfully, but could not retrieve updated data"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Return success with updated item data
      return new Response(
        JSON.stringify({
          success: true,
          message: "Menu item updated successfully",
          data: updatedItem
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    } catch (error) {
      console.error("Menu item API error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "An unexpected error occurred"
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }

  // Return 405 for unsupported methods
  return new Response(
    JSON.stringify({
      success: false,
      message: "Method not allowed"
    }),
    { 
      status: 405, 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      } 
    }
  );
}