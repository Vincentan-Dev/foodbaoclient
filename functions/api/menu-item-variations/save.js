import { getSupabase, getCorsHeaders } from '../_supabaseClient.js';

/**
 * Simple endpoint to save menu item variations with minimal authentication
 * This endpoint accepts username directly in the request body for simplicity
 * It performs a clean delete-then-insert operation for menu item variations
 */
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // This endpoint only processes POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 405
      });
    }
    
    // Parse JSON body
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid JSON in request body'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400
      });
    }
    
    // Extract required data
    const { itemId, username, variations } = requestData;
    
    // Validate required parameters
    if (!itemId) {
      console.error('Missing required parameter: itemId');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required parameter: itemId'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400
      });
    }
    
    if (!username) {
      console.error('Missing required parameter: username');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required parameter: username'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400
      });
    }
    
    // Validate variations array - it can be empty but must be an array
    if (!Array.isArray(variations)) {
      console.error('Invalid variations format, must be an array');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid variations format, must be an array'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400
      });
    }
    
    console.log(`Processing save variations request for menu item ${itemId} by user ${username}`);
    console.log(`Received ${variations.length} variations to save`);
    
    // Create Supabase client
    const supabase = getSupabase(context);
    
    // First, verify that this menu item belongs to the specified username
    console.log(`Verifying menu item ownership for itemId ${itemId} and username ${username}`);
    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .select('USERNAME')
      .eq('ITEM_ID', itemId)
      .single();
    
    // Handle menu item verification errors
    if (menuItemError) {
      if (menuItemError.code === 'PGRST116') { // Not found error
        console.error(`Menu item ${itemId} not found`);
        return new Response(JSON.stringify({
          success: false,
          message: 'Menu item not found',
          error: menuItemError.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 404
        });
      }
      
      console.error(`Error verifying menu item: ${menuItemError.message}`);
      return new Response(JSON.stringify({
        success: false,
        message: 'Error verifying menu item',
        error: menuItemError.message
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500
      });
    }
    
    // If menu item doesn't belong to the specified username and we're not in development mode
    if (menuItem && menuItem.USERNAME !== username && !env.ALLOW_CROSS_USER_OPERATIONS) {
      console.error(`Menu item belongs to ${menuItem.USERNAME}, not ${username}. Access denied.`);
      return new Response(JSON.stringify({
        success: false,
        message: 'Access denied: This menu item does not belong to your account'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 403
      });
    }
    
    // Start transaction
    console.log('Starting transaction for variations update');
    
    try {
      // Step 1: Delete all existing variations for this item and username
      console.log(`Deleting existing variations for menu item ${itemId} and username ${username}`);
      const { error: deleteError } = await supabase
        .from('menu_item_variations')
        .delete()
        .eq('ITEM_ID', itemId)
        .eq('USERNAME', username);
      
      if (deleteError) {
        console.error('Error deleting existing variations:', deleteError);
        return new Response(JSON.stringify({
          success: false,
          message: 'Error deleting existing variations',
          error: deleteError.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
      
      // If no new variations, we're done
      if (variations.length === 0) {
        console.log(`No new variations to add for menu item ${itemId}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'All variations removed successfully',
          count: 0
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Step 2: Insert new variations
      console.log(`Inserting ${variations.length} new variations for menu item ${itemId}`);
      
      // Validate each variation has required fields
      const validVariations = variations.filter(v => {
        const isValid = v && v.VARIATION_ID && v.ITEM_ID;
        if (!isValid) {
          console.warn('Found invalid variation, skipping:', v);
        }
        return isValid;
      });
      
      // Ensure all variations have the correct ITEM_ID and USERNAME
      // Only include fields that exist in the database schema
      const processedVariations = validVariations.map(v => {
        // Create a clean object with only the fields we need
        const cleanVariation = {
          ITEM_ID: parseInt(itemId),
          VARIATION_ID: parseInt(v.VARIATION_ID),
          USERNAME: username,
          PRICE: parseFloat(v.PRICE) || 0,
          CREATED_BY: username // Optional - set creator field
        };
        
        // Explicitly remove IS_ACTIVE if it exists to avoid schema errors
        if (cleanVariation.hasOwnProperty('IS_ACTIVE')) {
          delete cleanVariation.IS_ACTIVE;
        }
        
        return cleanVariation;
      });
      
      if (processedVariations.length === 0) {
        console.warn('No valid variations provided');
        return new Response(JSON.stringify({
          success: true,
          message: 'No valid variations to add',
          count: 0
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      console.log('Processed variations for insert:', processedVariations);
      
      const { data: insertResult, error: insertError } = await supabase
        .from('menu_item_variations')
        .insert(processedVariations)
        .select();
      
      if (insertError) {
        console.error('Error creating variation mappings:', insertError);
        return new Response(JSON.stringify({
          success: false,
          message: 'Error creating variation mappings',
          error: insertError.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
      
      // Success response
      console.log(`Successfully saved ${processedVariations.length} variations for menu item ${itemId}`);
      return new Response(JSON.stringify({
        success: true,
        message: `Successfully saved ${processedVariations.length} variations`,
        count: processedVariations.length,
        data: insertResult
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
      
    } catch (error) {
      console.error('Error in variations save transaction:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Error saving variations',
        error: error.message
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500
      });
    }
    
  } catch (error) {
    console.error('Unhandled error in save variations endpoint:', error);
    return new Response(JSON.stringify({
      success: false, 
      message: 'Server error',
      error: error.message
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders() } 
    });
  }
}