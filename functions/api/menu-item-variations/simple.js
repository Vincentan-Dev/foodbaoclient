import { getSupabase, getCorsHeaders } from '../_supabaseClient.js';

/**
 * Simple endpoint to fetch menu item variations with minimal authentication
 * This endpoint accepts username as a query parameter for simplicity
 * It's designed for simpler calls from frontend without complex auth logic
 */
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Parse URL to get parameters
    const url = new URL(request.url);
    
    // Get required parameters from query
    const itemId = url.searchParams.get('itemId');
    let username = url.searchParams.get('username');
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // For GET requests (fetch variations)
    if (request.method === "GET") {
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
      
      console.log(`Simple endpoint: Fetching variations for menu item ID: ${itemId} and username: ${username}`);
      
      // Create Supabase client
      const supabase = getSupabase(context);
      
      try {
        // First, validate that this menu item belongs to the specified username
        console.log(`Verifying menu item ownership for itemId ${itemId} and username ${username}`);
        const { data: menuItem, error: menuItemError } = await supabase
          .from('menu_items')
          .select('USERNAME')
          .eq('ITEM_ID', itemId)
          .single();
          
        // If menu item not found, return empty array rather than error
        if (menuItemError || !menuItem) {
          console.log('Menu item not found, returning empty array:', menuItemError?.message);
          return new Response(JSON.stringify({
            success: true,
            data: [],
            message: 'Menu item not found'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // If username doesn't match and we're not in development mode, protect the data
        if (menuItem.USERNAME !== username && !env.ALLOW_CROSS_USER_OPERATIONS) {
          console.log(`Menu item belongs to ${menuItem.USERNAME}, not ${username}. Access denied.`);
          return new Response(JSON.stringify({
            success: false,
            message: 'Access denied: This menu item does not belong to your account'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 403
          });
        }
        
        // Now fetch variations with confirmed username
        console.log(`Username verified, fetching variations for itemId ${itemId}`);
        
        // Fetch variation mappings for this item
        const { data: mappings, error: mappingError } = await supabase
          .from('menu_item_variations')
          .select('"VARIATION_ID", "PRICE"')
          .eq('ITEM_ID', itemId)
          .eq('USERNAME', username);
        
        if (mappingError) {
          console.error('Error fetching variation mappings:', mappingError);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching variation mappings',
            error: mappingError.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        // If no mappings found, return empty array
        if (!mappings || mappings.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            data: [],
            message: 'No variations found for this menu item'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Extract variation IDs from mappings
        const variationIds = mappings.map(m => m.VARIATION_ID);
        
        // Fetch detailed variation information
        const { data: variations, error: variationsError } = await supabase
          .from('items_variations')
          .select('*')
          .in('VARIATION_ID', variationIds)
          .eq('USERNAME', username);
        
        if (variationsError) {
          console.error('Error fetching variations by IDs:', variationsError);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching variations by IDs',
            error: variationsError.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        // Merge price information from mappings with variation details
        const enhancedVariations = variations.map(variation => {
          // Find the mapping for this variation to get price override
          const mapping = mappings.find(m => m.VARIATION_ID === variation.VARIATION_ID);
          
          // If price override exists in the mapping, add it as a separate property
          if (mapping && mapping.PRICE !== null) {
            return {
              ...variation,
              PRICE: mapping.PRICE,
              OVERRIDE_PRICE: mapping.PRICE
            };
          }
          
          return variation;
        });
        
        // Return successful response with the variations
        return new Response(JSON.stringify({
          success: true,
          data: enhancedVariations
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
        
      } catch (error) {
        console.error('Error processing variation request:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Server error processing variation request',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
    }
    
    // If we get here, it's an unsupported method
    return new Response(JSON.stringify({
      success: false,
      message: 'Method not allowed'
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 405
    });
    
  } catch (error) {
    console.error('Unhandled error in simple variations endpoint:', error);
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