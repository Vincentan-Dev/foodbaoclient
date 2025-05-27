import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Only accept DELETE requests
    if (request.method !== "DELETE") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Parse URL parameters
    const url = new URL(request.url);
    const publicId = url.searchParams.get('public_id');
    const username = url.searchParams.get('username');
    
    if (!publicId) {
      return new Response(JSON.stringify({
        success: false,
        message: "public_id parameter is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "username parameter is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get Supabase credentials using the centralized module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    const credResponse = await fetch(
      `${supabaseUrl}/rest/v1/cloudinaryacc?username=eq.${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const credentials = await credResponse.json();
    
    if (!credentials || credentials.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No Cloudinary credentials found for this user"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get the first account's credentials
    const account = credentials[0];
    
    // Use the Cloudinary Admin API to delete the image
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await generateSignature(account.api_secret, {
      public_id: publicId,
      timestamp: timestamp
    });
    
    const deleteResponse = await fetch(`https://api.cloudinary.com/v1_1/${account.cloud_name}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_id: publicId,
        timestamp: timestamp,
        api_key: account.api_key,
        signature: signature
      })
    });
    
    const deleteResult = await deleteResponse.json();
    
    return new Response(JSON.stringify({
      success: deleteResult.result === 'ok',
      message: deleteResult.result,
      details: deleteResult
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Helper function to generate Cloudinary API signature
async function generateSignature(apiSecret, params) {
  // Create a string of key=value pairs sorted by key
  const stringToSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Append API secret
  const signatureString = stringToSign + apiSecret;
  
  // Create SHA-1 hash
  const msgUint8 = new TextEncoder().encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  
  // Convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}