import { createClient } from '@supabase/supabase-js';

// CORS headers helper function
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Debug logging helper
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH-DEBUG ${timestamp}] ${message}`);
  if (data) {
    // Don't log actual passwords, but log length
    if (data.password) {
      const passwordLength = data.password.length;
      data = { ...data, password: `<${passwordLength} chars>` };
    }
    
    if (data.PASSWORD_HASH) {
      const hashLength = data.PASSWORD_HASH.length;
      const hashPreview = data.PASSWORD_HASH.substring(0, 5) + '...' + data.PASSWORD_HASH.substring(hashLength - 5);
      data = { ...data, PASSWORD_HASH: hashPreview + ` (${hashLength} chars)` };
    }
    
    console.log(data);
  }
}

// Helper function to directly call Supabase RPC with proper authorization
async function callDirectRpc(supabaseUrl, supabaseKey, functionName, params) {
  debugLog(`Calling RPC function directly: ${functionName}`, { 
    paramsKeys: Object.keys(params),
    urlPrefix: supabaseUrl.substring(0, 10) + '...',
    keyLength: supabaseKey.length
  });
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(params)
    });
    
    debugLog(`RPC response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog(`RPC error: ${response.status}`, { error: errorText });
      
      // Enhanced error handling - log more details about the request
      debugLog('Failed RPC request details', {
        url: `${supabaseUrl}/rest/v1/rpc/${functionName}`,
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        functionParams: JSON.stringify(params).replace(/"p_password":"[^"]*"/, '"p_password":"<redacted>"')
      });
      
      throw new Error(`RPC call failed with status ${response.status}: ${errorText}`);
    }
    
    // Parse and validate response
    const result = await response.json();
    debugLog('RPC response data', {
      responseType: typeof result,
      isObject: typeof result === 'object',
      hasSuccess: result && typeof result.success === 'boolean',
      success: result && result.success
    });
    
    return result;
  } catch (error) {
    debugLog('RPC call error', { error: error.message, stack: error.stack });
    throw error;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
    // Enhanced diagnostic endpoint - access at /api/auth?debug=true
  const url = new URL(request.url);
  if (url.searchParams.get('debug') === 'true') {
    debugLog('Debug endpoint accessed');
    
    const supabaseUrl = env.SUPABASE_URL || "https://icqbjfixyidhhrpnekdl.supabase.co";
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    
    return new Response(JSON.stringify({
      supabaseUrlSet: !!env.SUPABASE_URL,
      supabaseUrlPrefix: supabaseUrl.substring(0, 20) + '...',
      supabaseKeySet: !!supabaseKey,
      supabaseKeyLength: supabaseKey ? supabaseKey.length : 0,
      usingFallbackUrl: !env.SUPABASE_URL,
      usingServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      usingAnonKey: !env.SUPABASE_SERVICE_ROLE_KEY && !!env.SUPABASE_ANON_KEY,
      node_compat: true,
      timestamp: new Date().toISOString(),
      debug_enabled: true,
      status: supabaseKey ? 'READY_WITH_FALLBACK' : 'MISSING_KEYS'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // Get options from query parameters or request body
    const directCheck = url.searchParams.get('direct') === 'true' || body.directCheck === true;
    const useDirectRpc = url.searchParams.get('direct_rpc') === 'true' || body.useDirectRpc === true;
    
    debugLog('Authentication attempt', {
      username,
      password,
      method: request.method,
      url: request.url,
      directCheck,
      useDirectRpc
    });
      // Debug credentials without exposing them completely
    debugLog('Environment check', {
      has_supabase_url: !!env.SUPABASE_URL,
      has_service_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
      url_prefix: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 10) + '...' : null,
      key_length: env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0
    });

    // Get Supabase configuration with fallbacks
    const supabaseUrl = env.SUPABASE_URL || "https://icqbjfixyidhhrpnekdl.supabase.co";
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
    }

    debugLog('Using Supabase config', {
      url: supabaseUrl.substring(0, 20) + '...',
      usingFallbackUrl: !env.SUPABASE_URL,
      keyLength: supabaseKey.length,
      usingServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    // Initialize Supabase with better error handling
    try {
      debugLog('Creating Supabase client');
        // Create the Supabase client with explicit configuration
      const supabase = createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      
      // Check if username is provided
      if (!username) {
        throw new Error('Username is required');
      }
      
      // Check if password is provided
      if (!password) {
        throw new Error('Password is required');
      }
      
      debugLog('Starting username search');
      
      // Try different combinations of username casing since the USERNAME column is the primary key
      // and has a unique constraint
      let user = null;
      let error = null;
      
      // Array of username variations to try
      const usernameVariations = [
        username,                   // As entered
        username.toUpperCase(),     // All uppercase
        username.toLowerCase(),     // All lowercase
        username.charAt(0).toUpperCase() + username.slice(1).toLowerCase() // First letter uppercase
      ];
      
      // Try each username variation
      for (const variation of usernameVariations) {
        debugLog('Trying username variation', { variation });
        
        const { data, error: queryError } = await supabase
          .from('userfile')
          .select('*')
          .eq('USERNAME', variation)
          .maybeSingle();
        
        if (data && !queryError) {
          user = data;
          debugLog('Found user with username variation', { variation, found: true });
          break;
        }
        
        error = queryError;
      }
      
      // If we still didn't find a user, try case-insensitive search as a last resort
      if (!user) {
        debugLog('Exact matches failed, trying case-insensitive search');
        
        const { data: ilikematches, error: ilikeError } = await supabase
          .from('userfile')
          .select('*')
          .ilike('USERNAME', `%${username}%`)
          .limit(1);
        
        if (ilikematches && ilikematches.length > 0 && !ilikeError) {
          user = ilikematches[0];
          debugLog('Found user with case-insensitive search', { 
            found_username: user.USERNAME, 
            search_term: username 
          });
        } else {
          error = ilikeError;
        }
      }
      
      // Check if user exists
      if (!user) {
        debugLog('User not found after all attempts', { username });
        throw new Error('User not found. Please check your username and try again.');
      }
      
      debugLog('User found, verifying password', { 
        found_username: user.USERNAME,
        has_password_hash: !!user.PASSWORD_HASH,
        hash_prefix: user.PASSWORD_HASH ? user.PASSWORD_HASH.substring(0, 10) + '...' : 'null',
        hash_length: user.PASSWORD_HASH ? user.PASSWORD_HASH.length : 0,
        is_bcrypt_format: user.PASSWORD_HASH ? user.PASSWORD_HASH.startsWith('$2') : false
      });
      
      let passwordVerified = false;
      
      // Always use direct RPC call for more reliable password verification
      // This is the most reliable method to verify bcrypt passwords with Supabase
      try {
        debugLog('Using auth RPC function for authentication');
          // Call the auth RPC function directly with proper authorization
        const result = await callDirectRpc(
          supabaseUrl,
          supabaseKey,
          'auth',
          {
            p_username: user.USERNAME,
            p_password: password
          }
        );
        
        debugLog('Auth RPC result', { 
          success: result.success, 
          message: result.message,
          hasUser: !!result.user
        });
        
        // The auth RPC function returns an object with success, message, and user properties
        if (result.success === true && result.user) {
          // Create token with user data from the RPC response
          const token = btoa(JSON.stringify({
            userId: result.user.id || result.user.ID,  // Support both id and ID
            username: result.user.username || result.user.USERNAME, // Support both username and USERNAME
            role: result.user.role || result.user.USER_ROLE, // Support both role and USER_ROLE
            exp: Math.floor(Date.now() / 1000) + 3600
          }));
          
          debugLog('Authentication successful', {
            username: result.user.username || result.user.USERNAME,
            role: result.user.role || result.user.USER_ROLE,
            token_length: token.length
          });
          
          // Return user data with information from the RPC response
          return new Response(
            JSON.stringify({ 
              user: {
                id: result.user.id || result.user.ID,
                username: result.user.username || result.user.USERNAME,
                email: result.user.email || result.user.EMAIL,
                role: result.user.role || result.user.USER_ROLE,
                clientId: user.CLIENT_ID,
                businessName: user.BUSINESSNAME
              }, 
              token 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        } else {
          debugLog('Authentication failed via RPC', { 
            message: result.message || 'Invalid credentials'
          });
          throw new Error(result.message || 'Invalid password. Please check your password and try again.');
        }
      } catch (rpcError) {
        debugLog('Auth RPC error', { 
          error: rpcError.message
        });
        
        // Check for the specific Postgres error about field name
        if (rpcError.message.includes('record "v_user" has no field "id"')) {
          // This is a database field name issue in the SQL function
          debugLog('SQL function field name error detected, suggesting fix');
          throw new Error('Authentication system configuration issue. Administrator needs to update the SQL function: Change "v_user.id" to "v_user.ID" (uppercase).');
        }
        
        // Add a fallback mechanism for when RPC fails
        if (rpcError.message.includes('function "auth" does not exist')) {
          debugLog('auth function not found, ensure it exists in your Supabase instance');
          throw new Error('Authentication system unavailable. Please contact system administrator.');
        } else {
          throw new Error(`Authentication failed: ${rpcError.message}`);
        }
      }
      
      // Check if the password verification was successful
      if (!passwordVerified) {
        debugLog('Invalid password', { 
          username: username,
          matching: false
        });
        throw new Error('Invalid password. Please check your password and try again.');
      }
      
      debugLog('Password validated successfully', { 
        username: user.USERNAME,
        matching: true 
      });
      
      // Update the last login time
      try {
        await supabase
          .from('userfile')
          .update({ LAST_LOGIN: new Date().toISOString() })
          .eq('USERNAME', user.USERNAME);
      } catch (updateError) {
        // Non-critical, just log the error but continue
        debugLog('Failed to update last login time', { error: updateError.message });
      }
      
      // Create token with user data
      const token = btoa(JSON.stringify({
        userId: user.ID,
        username: user.USERNAME,
        role: user.USER_ROLE,
        exp: Math.floor(Date.now() / 1000) + 3600
      }));
      
      debugLog('Authentication successful', {
        username: user.USERNAME,
        role: user.USER_ROLE,
        token_length: token.length
      });
      
      // Return user data with information from the database
      return new Response(
        JSON.stringify({ 
          user: {
            id: user.ID,
            username: user.USERNAME,
            email: user.EMAIL,
            role: user.USER_ROLE,
            clientId: user.CLIENT_ID,
            businessName: user.BUSINESSNAME
          }, 
          token 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (supabaseError) {
      debugLog('Supabase connection or authentication error', { 
        error: supabaseError.message,
        stack: supabaseError.stack
      });
      
      throw supabaseError;
    }
  } catch (error) {
    debugLog('Authentication error', { 
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed', 
        message: error.message,
        debug: true,
        timestamp: new Date().toISOString()
      }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}