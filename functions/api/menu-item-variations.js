import { getSupabaseConfig, getCorsHeaders, getSupabase } from './_supabaseClient.js';

/**
 * This endpoint manages the relationship between menu items and their available variations
 * It serves as a junction table API handler between menu_items and items_variations tables
 */

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Parse URL to get parameters
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Support both query parameter and path parameter for itemId
    // First check if itemId is in the path (e.g., /api/menu-item-variations/18)
    let itemId = null;
    if (pathParts.length >= 2 && pathParts[1]) {
      itemId = pathParts[1];
      console.log(`Found itemId ${itemId} in path parameter`);
    }
    
    // If not found in path, check query parameter (e.g., /api/menu-item-variations?itemId=18)
    if (!itemId) {
      itemId = url.searchParams.get('itemId');
      if (itemId) {
        console.log(`Found itemId ${itemId} in query parameter`);
      }
    }

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Get Supabase credentials and client
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    const supabase = getSupabase(context);
    
    // Get authentication header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth header missing or invalid:', authHeader);
      // Continue without auth header - we'll try other methods to get username
    } else {
      console.log('Auth header present, continuing with authentication');
    }
    
    // GET method to fetch variations for a specific menu item
    if (request.method === "GET" && itemId) {
      // Add check to prevent fetch if ITEM_ID is null or empty
      if (!itemId || itemId === '' || itemId === 'null' || itemId === 'undefined') {
        console.log('Skipping fetch: ITEM_ID is null or empty:', itemId);
        return new Response(JSON.stringify({
          success: true,
          data: [],
          message: 'No variations fetched: Item ID is null or empty'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      console.log(`Fetching variations for menu item ID: ${itemId}`);
      
      try {
        console.log("Querying menu_item_variations table using UPPERCASE column names per schema");
        
        // First, we need to determine the username for proper filtering
        let username = null;
        
        // Check explicit X-Username header first (added from client patch)
        const explicitUsername = request.headers.get('X-Username');
        if (explicitUsername) {
          username = explicitUsername;
          console.log(`Using explicit username from X-Username header: ${username}`);
        }
        
        // If no explicit username, try to get it from menu item
        if (!username) {
          const { data: menuItem, error: menuItemError } = await supabase
            .from('menu_items')
            .select('USERNAME')
            .eq('ITEM_ID', itemId)
            .single();
          
          if (!menuItemError && menuItem && menuItem.USERNAME) {
            username = menuItem.USERNAME;
            console.log(`Retrieved username ${username} from menu item`);
          }
        }
        
        // If still no username, try to extract from auth token with improved validation
        if (!username && authHeader) {
          console.log('Attempting to extract username from auth header', { headerExists: !!authHeader });
          
          // Support both "Bearer " prefix and raw token format
          let token = authHeader;
          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
          }
          
          if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
            console.error('Invalid token format:', { 
              tokenExists: !!token, 
              tokenLength: token ? token.length : 0 
            });
          } else {
            console.log('Token validation: Valid token format detected');
            
            try {
              // First try with the auth.getUser method
              console.log('Attempting to validate token with getUser');
              const { data: userData, error: userError } = await supabase.auth.getUser(token);
              
              if (!userError && userData && userData.user && userData.user.email) {
                username = userData.user.email;
                console.log(`Successfully extracted username from token: ${username}`);
              } else {
                console.log('Failed to extract user from token with getUser:', 
                  userError?.message || 'No user data');
                
                // Alternative: try with session decode if getUser failed
                try {
                  console.log('Attempting secondary token validation with JWT decode');
                  const { data: jwtData, error: jwtError } = await supabase.auth.getSession({ token });
                  
                  if (!jwtError && jwtData && jwtData.session && jwtData.session.user && jwtData.session.user.email) {
                    username = jwtData.session.user.email;
                    console.log(`Retrieved username from JWT session: ${username}`);
                  } else {
                    console.log('Secondary JWT validation failed:', 
                      jwtError?.message || 'No valid session data');
                  }
                } catch (jwtError) {
                  console.error('Error during JWT validation:', jwtError);
                }
              }
            } catch (tokenError) {
              console.error('Error validating token:', tokenError);
            }
          }
          
          // Last resort: Check for ANON_PUBLIC_USERNAME environment variable
          if (!username && env.ANON_PUBLIC_USERNAME) {
            console.log('Using anon public username from environment as fallback');
            username = env.ANON_PUBLIC_USERNAME;
          }
        }
        
        // Additional fallback: Check X-Menu-Item-ID header to get username directly
        if (!username) {
          const menuItemId = request.headers.get('X-Menu-Item-ID') || itemId;
          if (menuItemId) {
            console.log(`Attempting to get username from menu item ID: ${menuItemId}`);
            
            const { data: menuItem, error: menuError } = await supabase
              .from('menu_items')
              .select('USERNAME')
              .eq('ITEM_ID', menuItemId)
              .single();
            
            if (!menuError && menuItem && menuItem.USERNAME) {
              username = menuItem.USERNAME;
              console.log(`Found username ${username} from menu item lookup`);
            } else {
              console.log('Failed to get username from menu item:', 
                menuError?.message || 'No menu item found');
            }
          }
        }
        
        // Final fallback - check direct X-Username header
        if (!username && explicitUsername) {
          username = explicitUsername;
          console.log(`Using explicit fallback username from X-Username header: ${username}`);
        }
        
        // Return error if we still don't have a username
        if (!username) {
          console.error("Could not determine username for filtering variations");
          return new Response(JSON.stringify({
            success: false,
            message: 'Authentication required: Could not determine username',
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 401
          });
        }
        
        // First, check if we have specific variation mappings for this item
        // Using UPPERCASE column names to match the actual database schema
        const { data: mappings, error: mappingError } = await supabase
          .from('menu_item_variations') 
          .select('"VARIATION_ID", "PRICE"')
          .eq('ITEM_ID', itemId)
          .eq('USERNAME', username); // Added filter by USERNAME
        
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
            .eq('USERNAME', username); // Added filter by USERNAME
          
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
                OVERRIDE_PRICE: mapping.PRICE
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
          // If no specific mappings found, return an empty array instead of fetching all
          // This ensures we only show variations that are actually in the junction table
          return new Response(JSON.stringify({
            success: true,
            data: []
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      } catch (error) {
        console.error('Error inspecting variation mappings:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Error inspecting database structure',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
    }
    
    // POST method to assign specific variations to a menu item with price overrides
    if (request.method === "POST") {
      // Support itemId from URL path as well
      let requestData = await request.json();
      
      // If itemId is in the path but not in the request data, add it
      if (itemId && !requestData.itemId) {
        requestData.itemId = itemId;
      }
      
      console.log('Received POST request with data:', JSON.stringify(requestData).substring(0, 200) + '...');
      
      // Check required fields
      if (!requestData.itemId || !Array.isArray(requestData.variations)) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid request: itemId and variations (array) are required'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
        });
      }
      
      // Try multiple methods to get the username in this priority order:
      // 1. From the menu item itself (most reliable source)
      // 2. From request data (explicit)
      // 3. From Supabase auth session
      let username = null;
      const authMethods = [];
      
      // First, try getting username from the menu item
      try {
        const { data: menuItem, error: menuError } = await supabase
          .from('menu_items')
          .select('USERNAME')
          .eq('ITEM_ID', requestData.itemId)
          .single();
        
        if (!menuError && menuItem && menuItem.USERNAME) {
          username = menuItem.USERNAME;
          authMethods.push('Menu item lookup');
          console.log("Using username from menu item:", username);
        } else {
          console.log("Failed to get username from menu item:", menuError?.message || "No username found");
        }
      } catch (menuError) {
        console.error("Failed to query menu item:", menuError);
      }
      
      // If not found in menu item, check the request data
      if (!username && requestData.username) {
        username = requestData.username;
        authMethods.push('Request data');
        console.log("Using provided username from request data:", username);
      }
      
      // If still not found, try getting from Supabase auth
      if (!username) {
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (user && user.email) {
            username = user.email;
            authMethods.push('Supabase auth');
            console.log("Using authenticated username from Supabase auth:", username);
          } else {
            console.log("No valid user found in auth session:", userError?.message || "No user or email");
          }
        } catch (authError) {
          console.log("Auth session retrieval failed:", authError);
        }
      }
      
      // Return error if we still don't have a username
      if (!username) {
        console.error("Authentication failed - could not determine username using methods:", authMethods);
        return new Response(JSON.stringify({
          success: false,
          message: 'Could not determine username from any source',
          details: 'Tried authentication methods: ' + (authMethods.length ? authMethods.join(', ') : 'None successful')
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 401
        });
      }
      
      // First, check if the menu item belongs to this user
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select('USERNAME')
        .eq('ITEM_ID', requestData.itemId)
        .single();
      
      if (menuError || !menuItem) {
        console.error('Error fetching menu item:', menuError);
        return new Response(JSON.stringify({
          success: false,
          message: 'Menu item not found',
          error: menuError?.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 404
        });
      }
      
      // Security check: Ensure the menu item belongs to this user
      // OR make this more lenient for development/testing
      if (menuItem.USERNAME !== username && !env.ALLOW_CROSS_USER_OPERATIONS) {
        console.log(`Username mismatch: Item belongs to ${menuItem.USERNAME} but request is from ${username}`);
        // For debugging, return more helpful error
        return new Response(JSON.stringify({
          success: false,
          message: 'Unauthorized: This menu item does not belong to your account',
          details: {
            itemUsername: menuItem.USERNAME,
            requestUsername: username,
            authMethod: authMethods.join(', ')
          }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 403
        });
      }
      
      // Remove existing mappings for clean slate
      const { error: deleteError } = await supabase
        .from('menu_item_variations')
        .delete()
        .eq('ITEM_ID', requestData.itemId);
      
      if (deleteError) {
        console.error('Error deleting existing mappings:', deleteError);
        // Continue despite error - this might be a new item with no mappings
      }
      
      // Insert new mappings with price information
      // Using UPPERCASE column names to match the actual database schema
      const mappingsToInsert = requestData.variations.map(variation => ({
        ITEM_ID: requestData.itemId,
        VARIATION_ID: variation.id,
        PRICE: variation.price || null, // Store custom price in PRICE column
        CREATED_BY: username,
        CREATED_AT: new Date().toISOString(),
        USERNAME: username
      }));
      
      // Only insert if we have variations to add
      if (mappingsToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('menu_item_variations')
          .insert(mappingsToInsert)
          .select();
        
        if (insertError) {
          console.error('Error inserting variation mappings:', insertError);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error creating variation mappings',
            error: insertError.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Menu item variations updated successfully',
          data: insertedData
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        // No variations to add, just return success
        return new Response(JSON.stringify({
          success: true,
          message: 'Menu item variations cleared successfully',
          data: []
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    // DELETE method to remove all variations for a menu item
    if (request.method === "DELETE") {
      // Check if the 'by-item' pattern is used in the path
      if (pathParts.length >= 3 && pathParts[1] === 'by-item' && pathParts[2]) {
        const itemIdToDelete = pathParts[2];
        console.log(`Processing DELETE request for all variations of menu item ID: ${itemIdToDelete}`);
        
        try {
          // First, check if the menu item exists and get its username
          const { data: menuItem, error: menuError } = await supabase
            .from('menu_items')
            .select('USERNAME')
            .eq('ITEM_ID', itemIdToDelete)
            .single();
          
          if (menuError) {
            console.error('Error fetching menu item:', menuError);
            return new Response(JSON.stringify({
              success: false,
              message: 'Menu item not found',
              error: menuError.message
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 404
            });
          }
          
          // Get username from auth header if available
          let requestUsername = null;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (user && user.email) {
                requestUsername = user.email;
              }
            } catch (authError) {
              console.log("Auth token validation failed:", authError);
            }
          }
          
          // Security check: Only allow deletion if usernames match or we're in development mode
          if (requestUsername && menuItem.USERNAME !== requestUsername && !env.ALLOW_CROSS_USER_OPERATIONS) {
            return new Response(JSON.stringify({
              success: false,
              message: 'Unauthorized: This menu item does not belong to your account',
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 403
            });
          }
          
          // Delete all variation mappings for this item
          const { error: deleteError } = await supabase
            .from('menu_item_variations')
            .delete()
            .eq('ITEM_ID', itemIdToDelete);
          
          if (deleteError) {
            console.error('Error deleting variation mappings:', deleteError);
            return new Response(JSON.stringify({
              success: false,
              message: 'Error deleting variation mappings',
              error: deleteError.message
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 500
            });
          }
          
          // Return success response
          return new Response(JSON.stringify({
            success: true,
            message: `All variations for menu item ${itemIdToDelete} deleted successfully`,
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          console.error('Error in DELETE operation:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Server error during deletion',
            error: error.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
      } else if (itemId) {
        // Support direct endpoint with itemId in the path
        console.log(`Processing DELETE request for all variations of menu item ID from path parameter: ${itemId}`);
        
        try {
          // Delete all variation mappings for this item
          const { error: deleteError } = await supabase
            .from('menu_item_variations')
            .delete()
            .eq('ITEM_ID', itemId);
          
          if (deleteError) {
            console.error('Error deleting variation mappings:', deleteError);
            return new Response(JSON.stringify({
              success: false,
              message: 'Error deleting variation mappings',
              error: deleteError.message
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 500
            });
          }
          
          // Return success response
          return new Response(JSON.stringify({
            success: true,
            message: `All variations for menu item ${itemId} deleted successfully`,
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          console.error('Error in DELETE operation:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Server error during deletion',
            error: error.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Missing itemId parameter for DELETE operation'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
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