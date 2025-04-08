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

// Web Crypto JWT implementation
async function createJWT(payload, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  
  // Create a key from the secret
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    'HMAC', key, data
  );
  
  // Create JWT format
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadBase64 = btoa(JSON.stringify(payload));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${header}.${payloadBase64}.${signatureBase64}`;
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
    return new Response(JSON.stringify({
      supabaseUrlSet: !!env.SUPABASE_URL,
      supabaseUrlPrefix: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 10) + '...' : null,
      supabaseKeySet: !!env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseKeyLength: env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      node_compat: true,
      timestamp: new Date().toISOString(),
      debug_enabled: true
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
    
    debugLog('Authentication attempt', {
      username,
      password,
      method: request.method,
      url: request.url
    });
    
    // Test hard-coded login for development
    if (username === 'vincent423' && password === 'vincent423') {
      debugLog('Development login successful', { username });
      
      // Create a demo response
      const userData = {
        id: 1,
        username: 'vincent423',
        role: 'admin',
        email: 'vincent@example.com'
      };
      
      // Create a simple token
      const token = btoa(JSON.stringify({
        userId: userData.id,
        username: userData.username,
        role: userData.role,
        exp: Math.floor(Date.now() / 1000) + 3600
      }));
      
      debugLog('Development token created', {
        tokenLength: token.length,
        userData: JSON.stringify(userData)
      });
      
      return new Response(
        JSON.stringify({ user: userData, token: token }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      // Initialize Supabase with better error handling
      try {
        debugLog('Connecting to Supabase', {
          url_preview: env.SUPABASE_URL?.substring(0, 10) + '...',
          key_length: env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
        });
        
        const supabase = createClient(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: { persistSession: false },
            global: {
              fetch: (url, options = {}) => {
                debugLog(`Fetching Supabase URL`, { 
                  url_preview: url.toString().substring(0, 30) + '...' 
                });
                return fetch(url, {
                  ...options,
                  headers: {
                    ...options.headers,
                    'Origin': 'https://foodbaoadmin.pages.dev'
                  },
                  cf: { // Cloudflare-specific fetch options
                    cacheTtl: 0,
                    cacheEverything: false,
                    scrapeShield: false
                  },
                  signal: AbortSignal.timeout(15000) // 15 second timeout
                });
              }
            }
          }
        );
        
        // Updated: Query the unified userfile table - use uppercase USERNAME for consistency
        const uppercaseUsername = username.toUpperCase();
        debugLog('Querying userfile table', { 
          username: username,
          uppercaseUsername: uppercaseUsername 
        });
        
        const { data, error } = await supabase.from('userfile')
          .select('*')
          .eq('USERNAME', uppercaseUsername)
          .single();
        
        if (error) {
          debugLog('Supabase query error', { error: error.message, code: error.code });
          throw error;
        }
        
        if (!data) {
          debugLog('User not found', { username: uppercaseUsername });
          throw new Error('User not found');
        }
        
        debugLog('User found, checking password', { 
          found_username: data.USERNAME,
          has_password_hash: !!data.PASSWORD_HASH,
          password_hash_length: data.PASSWORD_HASH ? data.PASSWORD_HASH.length : 0,
          input_password_length: password ? password.length : 0
        });
        
        // Log input password vs stored hash for debugging
        if (data.PASSWORD_HASH && password) {
          debugLog('Password comparison', {
            password: password,
            PASSWORD_HASH: data.PASSWORD_HASH,
            match: password === data.PASSWORD_HASH
          });
        }
        
        // Check password (direct comparison with PASSWORD_HASH field)
        if (password !== data.PASSWORD_HASH) {
          debugLog('Invalid password', { 
            username: uppercaseUsername,
            password_length: password?.length || 0,
            hash_length: data.PASSWORD_HASH?.length || 0,
            matching: false
          });
          throw new Error('Invalid password');
        }
        
        debugLog('Password validated successfully', { 
          username: uppercaseUsername,
          matching: true 
        });
        
        // Update the last login time
        await supabase.from('userfile')
          .update({ LAST_LOGIN: new Date().toISOString() })
          .eq('USERNAME', uppercaseUsername);
        
        // Create token with user data
        const token = btoa(JSON.stringify({
          userId: data.ID,
          username: data.USERNAME,
          role: data.USER_ROLE,
          exp: Math.floor(Date.now() / 1000) + 3600
        }));
        
        debugLog('Authentication successful', {
          username: data.USERNAME,
          role: data.USER_ROLE,
          token_length: token.length
        });
        
        // Return user data with information from the unified table
        return new Response(
          JSON.stringify({ 
            user: {
              id: data.ID,
              username: data.USERNAME,
              email: data.EMAIL,
              role: data.USER_ROLE,
              clientId: data.CLIENT_ID,
              businessName: data.BUSINESSNAME
            }, 
            token 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (supabaseError) {
        debugLog('Supabase connection error', { 
          error: supabaseError.message,
          stack: supabaseError.stack
        });
        
        // Fall back to hardcoded for dev environments
        if (username === 'vincent423') {
          debugLog('Falling back to development credentials', { username });
          // Create a demo response
          const userData = {
            id: 1,
            username: 'vincent423',
            role: 'admin',
            email: 'vincent@example.com'
          };
          
          // Create a simple token
          const token = btoa(JSON.stringify({
            userId: userData.id,
            username: userData.username,
            role: userData.role,
            exp: Math.floor(Date.now() / 1000) + 3600
          }));
          
          debugLog('Fallback token created', {
            tokenLength: token.length,
            userData: JSON.stringify(userData)
          });
          
          return new Response(
            JSON.stringify({ user: userData, token: token }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        } else {
          throw supabaseError;
        }
      }
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
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}