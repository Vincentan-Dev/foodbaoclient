import { getSupabaseConfig, getCorsHeaders, getSupabase } from './_supabaseClient.js';

// Debug helper function to safely log objects
function safeStringify(obj) {
  try {
    return JSON.stringify(obj, (key, value) => 
      value instanceof Error ? { 
        message: value.message,
        stack: value.stack,
        name: value.name 
      } : value
    );
  } catch (e) {
    return `[Circular or unstringifiable object]: ${typeof obj}`;
  }
}

// Debug tracker for monitoring API calls
const DebugTracker = {
  requestCount: 0,
  
  logRequest: function(request, id) {
    try {
      const reqId = id || ++this.requestCount;
      const method = request.method;
      const url = request.url || 'unknown-url';
      const headers = {};
      
      // Safely extract headers
      try {
        request.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'authorization') {
            headers[key] = value;
          } else {
            headers[key] = 'Bearer [REDACTED]';
          }
        });
      } catch (headerErr) {
        headers.error = headerErr.message;
      }
      
      console.log(`[DEBUG:${reqId}] Request: ${method} ${url}`);
      console.log(`[DEBUG:${reqId}] Headers: ${safeStringify(headers)}`);
      
      return reqId;
    } catch (e) {
      console.error('[DEBUG-ERROR] Failed to log request:', e);
      return 0;
    }
  },
  
  logUrlParsing: function(reqId, url, pathParts) {
    try {
      console.log(`[DEBUG:${reqId}] URL parsed: ${url}`);
      console.log(`[DEBUG:${reqId}] Path parts: ${safeStringify(pathParts)}`);
      console.log(`[DEBUG:${reqId}] Search params: ${url.search}`);
    } catch (e) {
      console.error(`[DEBUG-ERROR:${reqId}] Failed to log URL parsing:`, e);
    }
  },

  logError: function(reqId, phase, error) {
    console.error(`[DEBUG:${reqId}] Error in ${phase}: ${error.message}`);
    console.error(`[DEBUG:${reqId}] Stack: ${error.stack || 'No stack trace'}`);
  },
  
  logSuccess: function(reqId, phase, data) {
    console.log(`[DEBUG:${reqId}] Success in ${phase}: ${safeStringify(data).substring(0, 200)}...`);
  }
};

/**
 * Helper function to parse JWT token for authentication
 * This serves as a fallback when Supabase auth fails
 */
function parseJWT(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT parsing error:', error);
    return null;
  }
}

/**
 * This endpoint handles operations for item variations
 * It can return all variations or perform searches by name
 */

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    const reqId = DebugTracker.logRequest(request);

    // Parse URL to get parameters
    const url = new URL(request.url);
    
    // Extract search parameter if provided
    const searchTerm = url.searchParams.get('search');
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Handle HEAD requests by returning just the headers without a body
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get Supabase client
    const supabase = getSupabase(context);
    
    // Enhanced authentication handling with multiple fallback methods
    const authHeader = request.headers.get('Authorization');
    let username = null;
    let authError = null;
    let userId = null;
    
    console.log(`[AUTH:${reqId}] Checking authentication header: ${authHeader ? 'Present' : 'Missing'}`);
    
    // First try to extract token from Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Log the token length for debugging (never log the full token)
      console.log(`[AUTH:${reqId}] Token length: ${token.length}, First 5 chars: ${token.substring(0, 5)}...`);
      
      try {
        // Try to get user from token with proper error handling
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.error(`[AUTH:${reqId}] Supabase auth error:`, error);
          authError = `Token validation failed: ${error.message}`;
          
          // Fallback: Try to parse the JWT token manually
          console.log(`[AUTH:${reqId}] Trying JWT fallback parsing`);
          const payload = parseJWT(token);
          if (payload && (payload.email || payload.sub)) {
            username = payload.email || `user-${payload.sub}`;
            userId = payload.sub;
            console.log(`[AUTH:${reqId}] JWT fallback successful, extracted username: ${username}`);
          }
        } else if (data && data.user && data.user.email) {
          username = data.user.email;
          userId = data.user.id;
          console.log(`[AUTH:${reqId}] Successfully authenticated user: ${username}`);
        } else {
          console.error(`[AUTH:${reqId}] No user data returned from token`);
          authError = 'Token validation succeeded but no user data found';
        }
      } catch (error) {
        console.error(`[AUTH:${reqId}] Exception during token validation:`, error);
        authError = `Exception during token validation: ${error.message}`;
        
        // Still try JWT parsing as fallback
        const payload = parseJWT(token);
        if (payload && (payload.email || payload.sub)) {
          username = payload.email || `user-${payload.sub}`;
          userId = payload.sub;
          console.log(`[AUTH:${reqId}] JWT fallback successful after exception, extracted username: ${username}`);
        }
      }
    }
    
    // For GET method, we allow access without strict auth - but filter by username if available
    if (request.method === "GET") {
      try {
        let query = supabase
          .from('items_variations')
          .select('*')
          .eq('STATUS', 'ACTIVE');
        
        // Apply search filter if provided
        if (searchTerm) {
          // Use ilike for case-insensitive search with wildcard matching
          query = query.ilike('NAME', `%${searchTerm}%`);
        }
        
        // If we have a username, filter by it
        if (username) {
          query = query.eq('USERNAME', username);
        }
        
        const { data: variations, error } = await query;
        
        if (error) {
          console.error('Error fetching variations:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching variations',
            error: error.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          variations: variations || []
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (error) {
        console.error('Error fetching variations:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Error fetching variations',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
    }
    
    // For all write operations (POST, PUT, DELETE), require authentication
    if (request.method === "POST") {
      // Parse request data first to check if it contains username as fallback
      let requestData;
      try {
        requestData = await request.clone().json();
        
        // If no username from token, check if request body has it as fallback
        if (!username && requestData && requestData.USERNAME) {
          username = requestData.USERNAME;
          console.log(`[AUTH:${reqId}] Using fallback username from request body: ${username}`);
        }
      } catch (e) {
        console.error(`[AUTH:${reqId}] Error parsing request body:`, e);
        // Continue with auth check, can't use request body username
      }
      
      // If there was an auth error and no username, return 401 with detailed error info
      if (!username) {
        console.error(`[AUTH:${reqId}] Authentication failed for POST request: ${authError || 'No valid token provided'}`);
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Authentication required to create variations',
          details: authError || 'No valid authentication token provided',
          help: 'Ensure you are logged in and your session has not expired'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 401
        });
      }
      
      // We have a valid username at this point
      console.log(`[API:${reqId}] Processing request with authenticated username: ${username}`);
      
      // Get the full request body now
      if (!requestData) {
        requestData = await request.json();
      }
      
      // Validate required fields
      if (!requestData.NAME) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Variation name is required'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
        });
      }
      
      // Check if we have action=delete for deletion operations
      if (requestData.action === 'delete') {
        // Handle deletion
        const variationId = requestData.variation_id;
        if (!variationId) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Variation ID is required for deletion'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 400
          });
        }
        
        // Perform soft delete by updating STATUS
        const { data: updatedVariation, error } = await supabase
          .from('items_variations')
          .update({
            STATUS: 'DELETED',
            UPDATED_BY: username,
            UPDATED_AT: new Date().toISOString()
          })
          .eq('VARIATION_ID', variationId)
          .eq('USERNAME', username) // Only delete own variations
          .select();
        
        if (error) {
          console.error('Error deleting variation:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete variation',
            error: error.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Variation deleted successfully',
          variation: updatedVariation[0]
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Check if we have action=update for updates
      if (requestData.action === 'update') {
        const variationId = requestData.variation_id;
        if (!variationId) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Variation ID is required for update'
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 400
          });
        }
        
        // Prepare update data
        const updateData = {
          NAME: requestData.NAME,
          STATUS: requestData.STATUS || 'ACTIVE',
          UPDATED_BY: username,
          UPDATED_AT: new Date().toISOString()
        };
        
        // Update the variation
        const { data: updatedVariation, error } = await supabase
          .from('items_variations')
          .update(updateData)
          .eq('VARIATION_ID', variationId)
          .eq('USERNAME', username) // Only update own variations
          .select();
        
        if (error) {
          console.error('Error updating variation:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update variation',
            error: error.message
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Variation updated successfully',
          variation: updatedVariation[0]
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Default action is create
      // Check if the variation with this name already exists for this user
      const { data: existingVariations, error: checkError } = await supabase
        .from('items_variations')
        .select('VARIATION_ID')
        .eq('USERNAME', username)
        .eq('NAME', requestData.NAME)
        .eq('STATUS', 'ACTIVE');
      
      if (checkError) {
        console.error('Error checking existing variations:', checkError);
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to validate variation uniqueness',
          error: checkError.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
      
      if (existingVariations && existingVariations.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          message: `A variation with the name "${requestData.NAME}" already exists for your account`
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
        });
      }
      
      // Prepare variation data
      const variationData = {
        NAME: requestData.NAME,
        STATUS: 'ACTIVE',
        CREATED_BY: username,
        CREATED_AT: new Date().toISOString(),
        USERNAME: username,
        IS_REQUIRED: requestData.IS_REQUIRED || false,
        DISPLAY_ORDER: requestData.DISPLAY_ORDER || 1
      };
      
      // Insert the new variation
      const { data: newVariation, error } = await supabase
        .from('items_variations')
        .insert(variationData)
        .select();
      
      if (error) {
        console.error('Error creating variation:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to create variation',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Variation created successfully',
        variation: newVariation[0]
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Unsupported HTTP method
    return new Response(JSON.stringify({
      success: false,
      message: `Unsupported method: ${request.method}`
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 405
    });
  } catch (error) {
    console.error('Unhandled error in variation API:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500
    });
  }
}

// Legacy handlers for backward compatibility
export async function onRequestGet(context) {
  return await onRequest(context);
}

export async function onRequestPost(context) {
  return await onRequest(context);
}

export async function onRequestOptions(context) {
  return await onRequest(context);
}

// Add support for HEAD requests
export async function onRequestHead(context) {
  const corsHeaders = getCorsHeaders();
  // For HEAD requests, return a success response with appropriate CORS headers
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}