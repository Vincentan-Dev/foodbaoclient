import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase API key in server configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Parse form data
    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'get') {
      const username = formData.get('username');
      if (!username) {
        return new Response(JSON.stringify({
          success: false,
          message: "Missing username parameter"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Query Supabase for the account
      const getResponse = await fetch(
        `${supabaseUrl}/rest/v1/cloudinaryacc?username=eq.${encodeURIComponent(username)}&order=created_at.desc&limit=1`, 
        {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        }
      );

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        return new Response(JSON.stringify({
          success: false,
          message: `Error fetching from database: ${getResponse.status} ${errorText}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const accounts = await getResponse.json();
      
      return new Response(JSON.stringify({
        success: true,
        data: accounts && accounts.length > 0 ? accounts[0] : null
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (action === 'validate') {
      try {
        // Get credentials from different sources
        let apiKey, apiSecret, cloudName;
        
        // Option 1: Use the provided credentials in the request
        const requestCloudName = formData.get('cloud_name');
        const requestApiKey = formData.get('api_key');
        const requestApiSecret = formData.get('api_secret');
        
        // Option 2: Use the CLOUDINARY_URL environment variable as fallback
        const cloudinaryUrl = env.CLOUDINARY_URL;
        
        if (requestCloudName && requestApiKey && requestApiSecret) {
          // Use credentials from request
          cloudName = requestCloudName;
          apiKey = requestApiKey;
          apiSecret = requestApiSecret;
          console.log('Using credentials from request');
        } else if (cloudinaryUrl) {
          // Parse credentials from CLOUDINARY_URL
          try {
            const withoutProtocol = cloudinaryUrl.replace('cloudinary://', '');
            const [creds, parsedCloudName] = withoutProtocol.split('@');
            const [parsedApiKey, parsedApiSecret] = creds.split(':');
            
            cloudName = parsedCloudName;
            apiKey = parsedApiKey;
            apiSecret = parsedApiSecret;
            console.log('Using credentials from environment variable');
          } catch (parseError) {
            return new Response(JSON.stringify({
              success: false,
              valid: false,
              message: "Failed to parse CLOUDINARY_URL: " + parseError.message
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        } else {
          return new Response(JSON.stringify({
            success: false,
            valid: false,
            message: "No Cloudinary credentials provided"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Construct the ping endpoint URL
        const pingUrl = `https://api.cloudinary.com/v1_1/${cloudName}/ping`;
        
        // Create the Basic Auth header
        const basicAuth = btoa(`${apiKey}:${apiSecret}`);
        
        // Make the request to Cloudinary's ping endpoint
        const pingResponse = await fetch(pingUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`
          }
        });
        
        // Parse response
        if (!pingResponse.ok) {
          return new Response(JSON.stringify({
            success: true,
            valid: false,
            message: `Cloudinary returned status: ${pingResponse.status}`,
            status: pingResponse.status
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const pingData = await pingResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          valid: pingData.status === 'ok',
          message: pingData.status === 'ok' ? 
            "Cloudinary credentials are valid" : 
            "Cloudinary credentials are invalid",
          details: pingData
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (validationError) {
        return new Response(JSON.stringify({
          success: false,
          valid: false,
          message: "Error validating Cloudinary credentials: " + validationError.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Prepare the data
    const accountData = {
      username: formData.get('username'),
      userid: formData.get('userid'),
      cloud_name: formData.get('cloud_name'),
      api_key: formData.get('api_key'),
      api_secret: formData.get('api_secret'),
      upload_preset: formData.get('upload_preset'),
      status: formData.get('status') || 'unknown'
    };
    
    // Check required fields
    const requiredFields = ['username', 'cloud_name', 'api_key', 'api_secret'];
    for (const field of requiredFields) {
      if (!accountData[field]) {
        return new Response(JSON.stringify({
          success: false,
          message: `Missing required field: ${field}`
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    let endpoint, method, body;
    const id = formData.get('id');
    
    if (action === 'update' && id) {
      // Update existing record
      endpoint = `${supabaseUrl}/rest/v1/cloudinaryacc?id=eq.${id}`;
      method = 'PATCH';
      body = JSON.stringify(accountData);
    } else {
      // Create new record
      endpoint = `${supabaseUrl}/rest/v1/cloudinaryacc`;
      method = 'POST';
      body = JSON.stringify([accountData]);
    }

    // Make request to Supabase
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        success: false,
        message: `Error from database: ${response.status} ${errorText}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: action === 'update' ? "Settings updated successfully" : "Settings created successfully",
      id: data && data.length > 0 ? data[0].id : id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}