import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

/**
 * Environment test endpoint to verify Cloudflare Pages environment variables
 */
export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders();
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Test environment variables
    const envTest = {
      supabaseUrlExists: !!env.SUPABASE_URL,
      supabaseUrlPreview: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 20) + '...' : 'NOT SET',
      supabaseServiceRoleKeyExists: !!env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseServiceRoleKeyLength: env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      supabaseAnonKeyExists: !!env.SUPABASE_ANON_KEY,
      allEnvKeys: Object.keys(env).filter(key => key.includes('SUPABASE')),
      timestamp: new Date().toISOString()
    };
      // Try to get Supabase config
    let configTest = null;
    try {
      const config = getSupabaseConfig(env);
      configTest = {
        success: true,
        hasUrl: !!config.supabaseUrl,
        hasKey: !!config.supabaseKey,
        isUsingServiceRole: config.isUsingServiceRole
      };
      
      // Test RPC call if config is available
      console.log('Testing authkey RPC function...');
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/authkey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        },
        body: JSON.stringify({
          p_username: 'test-user-that-probably-does-not-exist'
        })
      });
      
      const result = await response.json();
      configTest.rpcTest = {
        status: response.status,
        success: result.success || false,
        message: result.message || 'No message',
        hasUser: !!result.user,
        responseKeys: Object.keys(result || {})
      };
      console.log('RPC test result:', configTest.rpcTest);
      
    } catch (error) {
      configTest = {
        success: false,
        error: error.message
      };
      console.error('Config/RPC test error:', error);
    }
    
    return new Response(JSON.stringify({
      success: true,
      environment: envTest,
      config: configTest
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
