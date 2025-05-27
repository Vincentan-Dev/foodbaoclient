// Get menu item variations by ID
import { getSupabaseConfig, getCorsHeaders, getSupabase } from '../_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const corsHeaders = getCorsHeaders();
    
    // Extract the ID from URL path parameters correctly
    // This uses the [id] filename pattern to correctly get the dynamic segment
    const itemId = params.id;
    
    // Get the username from query parameters or headers
    const url = new URL(request.url);
    let username = url.searchParams.get('username');
    
    // If username not in URL, check X-Username header
    if (!username) {
      username = request.headers.get('X-Username');
    }
    
    console.log(`Processing request for menu item variations with ID: ${itemId} and username: ${username}`);
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Get Supabase client
    const supabase = getSupabase(context);
    
    if (request.method === "GET") {
      console.log(`Fetching variations for menu item ID: ${itemId} and username: ${username}`);
      
      // Validate required parameters
      if (!itemId) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Item ID is required'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
        });
      }
      
      // If username is not provided, try to get it from the menu item
      if (!username) {
        const { data: menuItem, error: menuError } = await supabase
          .from('menu_items')
          .select('USERNAME')
          .eq('ITEM_ID', itemId)
          .single();
        
        if (menuItem && menuItem.USERNAME) {
          username = menuItem.USERNAME;
          console.log(`Retrieved username ${username} from menu item`);
        } else {
          console.error('Could not determine username:', menuError || 'Item not found');
          return new Response(JSON.stringify({
            success: false,
            message: 'Username is required and could not be determined'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 400
          });
        }
      }
      
      try {
        console.log(`Querying menu_item_variations table for itemId=${itemId} and username=${username}`);
        
        // Properly filter mappings by both ITEM_ID and USERNAME
        const { data: mappings, error: mappingError } = await supabase
          .from('menu_item_variations') 
          .select('"VARIATION_ID", "PRICE"')
          .eq('ITEM_ID', itemId)
          .eq('USERNAME', username); // Added USERNAME filter
        
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
        
        // If we have specific mappings, fetch only those variations
        if (mappings && mappings.length > 0) {
          const variationIds = mappings.map(m => m.VARIATION_ID);
          
          const { data: variations, error: variationsError } = await supabase
            .from('items_variations')
            .select('*')
            .in('VARIATION_ID', variationIds)
            .eq('STATUS', 'ACTIVE')
            .eq('USERNAME', username); // Make sure we filter variations by USERNAME too
          
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
            // Find the mapping for this variation to get price override (if any)
            const mapping = mappings.find(m => m.VARIATION_ID === variation.VARIATION_ID);
            
            // If price override exists in the mapping, use it instead of the default price
            if (mapping && mapping.PRICE !== null) {
              return {
                ...variation,
                PRICE: mapping.PRICE, // Set PRICE directly from mapping
                MIN_PRICE: mapping.PRICE // Keep MIN_PRICE for backward compatibility
              };
            }
            
            return variation;
          });
          
          return new Response(JSON.stringify({
            success: true,
            data: enhancedVariations
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } else {
          // No mappings found - return empty array
          console.log(`No variation mappings found for itemId=${itemId} and username=${username}`);
          return new Response(JSON.stringify({
            success: true,
            data: []
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      } catch (error) {
        console.error('Error processing variation mappings:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Error processing variation data',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
    }
    
    // For POST requests, delegate to the main handler
    if (request.method === "POST") {
      // Use the main handler in menu-item-variations.js
      const { onRequest } = await import('../menu-item-variations.js');
      return onRequest(context);
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
    console.error('Unhandled error:', error);
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