import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    // Use the centralized CORS headers
    const corsHeaders = getCorsHeaders();
    
    // Handle OPTIONS request for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    const url = new URL(request.url);
    
    // Get original action from URL parameters
    let actionParam = url.searchParams.get('action') || 'unknown';
    
    console.log(`Processing cloudinary API request: ${actionParam}`);
    
    if (!supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase API key in server configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Different handling based on action and method
    if (request.method === 'POST') {
      // Parse the request body based on content type
      let requestData;
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        requestData = await request.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        requestData = {};
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
        
        // Override action if provided in form data (using a new variable)
        if (requestData.action) {
          actionParam = requestData.action;
        }
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: "Unsupported content type"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Handle different actions
      switch (actionParam) {
        case 'validate':
          return await validateCloudinaryCredentials(requestData, env);
        
        case 'get':
          return await getCloudinaryAccount(requestData, supabaseUrl, supabaseKey);
        
        case 'create':
          return await createCloudinaryAccount(requestData, supabaseUrl, supabaseKey);
        
        case 'update':
          return await updateCloudinaryAccount(requestData, supabaseUrl, supabaseKey);
        
        case 'upsert':
          return await upsertCloudinaryAccount(requestData, supabaseUrl, supabaseKey);
          
        default:
          return new Response(JSON.stringify({
            success: false,
            message: `Unknown action: ${actionParam}`
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
      }
    } else if (request.method === 'GET') {
      // Handle GET requests - typically for fetching accounts
      const username = url.searchParams.get('username');
      
      if (actionParam === 'get' && username) {
        return await getCloudinaryAccount({ username }, supabaseUrl, supabaseKey);
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid GET request parameters"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: `Method not supported: ${request.method}`
    }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Helper functions for various operations
async function validateCloudinaryCredentials(data, env) {
  try {
    // Get credentials from request
    const cloudName = data.cloud_name;
    const apiKey = data.api_key;
    const apiSecret = data.api_secret;
    
    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({
        success: false,
        valid: false,
        message: "Missing required credentials"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const pingData = await pingResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      valid: pingData.status === 'ok',
      message: pingData.status === 'ok' ? 
        "Cloudinary credentials are valid" : 
        "Cloudinary credentials are invalid",
      cloud_name: cloudName,
      details: pingData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({
      success: false,
      valid: false,
      message: "Error validating Cloudinary credentials: " + error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to get a Cloudinary account from Supabase
async function getCloudinaryAccount(data, supabaseUrl, supabaseKey) {
  try {
    const { username } = data;
    
    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing username parameter"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const accounts = await getResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: accounts && accounts.length > 0 ? accounts[0] : null
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error getting account:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Error fetching Cloudinary account: " + error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to create a new Cloudinary account in Supabase
async function createCloudinaryAccount(data, supabaseUrl, supabaseKey) {
  try {
    // Extract and validate required fields
    const accountData = {
      username: data.username,
      userid: data.userid || '',
      cloud_name: data.cloud_name,
      api_key: data.api_key,
      api_secret: data.api_secret,
      upload_preset: data.upload_preset || 'ml_default',
      status: data.status || 'unknown'
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
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Insert into Supabase
    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/cloudinaryacc`, 
      {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify([accountData])
      }
    );
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return new Response(JSON.stringify({
        success: false,
        message: `Error creating account in database: ${createResponse.status} ${errorText}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const result = await createResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Cloudinary account created successfully",
      data: result[0]
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Error creating Cloudinary account: " + error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to update an existing Cloudinary account in Supabase
async function updateCloudinaryAccount(data, supabaseUrl, supabaseKey) {
  try {
    const id = data.id;
    
    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing account ID"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Extract fields to update
    const accountData = {
      username: data.username,
      userid: data.userid || '',
      cloud_name: data.cloud_name,
      api_key: data.api_key,
      api_secret: data.api_secret,
      upload_preset: data.upload_preset || 'ml_default',
      status: data.status || 'unknown',
      updated_at: new Date().toISOString()
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
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Update in Supabase
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/cloudinaryacc?id=eq.${id}`, 
      {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(accountData)
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return new Response(JSON.stringify({
        success: false,
        message: `Error updating account in database: ${updateResponse.status} ${errorText}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const result = await updateResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Cloudinary account updated successfully",
      data: result[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Error updating Cloudinary account: " + error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to upsert a Cloudinary account (create if not exists, update if exists)
async function upsertCloudinaryAccount(data, supabaseUrl, supabaseKey) {
  try {
    // Extract all fields from the data
    const { username, userid, cloud_name, api_key, api_secret, upload_preset, id } = data;
    
    // Notice we're not including 'status' field since it doesn't exist in the database
    
    // Validate required fields
    if (!username || !cloud_name || !api_key || !api_secret) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required account information"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check if record exists by getting the current record
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/cloudinaryacc?username=eq.${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      throw new Error(`Error checking existing account: ${checkResponse.status} ${errorText}`);
    }
    
    const existingRecords = await checkResponse.json();
    const exists = existingRecords && existingRecords.length > 0;
    
    // Prepare data for upsert (without status field)
    const accountData = {
      username,
      userid: userid || '',
      cloud_name,
      api_key,
      api_secret,
      upload_preset: upload_preset || 'ml_default'
    };
    
    // If ID was provided, include it
    if (id) {
      accountData.id = id;
    }
    
    let upsertResponse;
    
    if (exists) {
      // Update the existing record
      const existingId = existingRecords[0].id;
      
      upsertResponse = await fetch(
        `${supabaseUrl}/rest/v1/cloudinaryacc?id=eq.${existingId}`,
        {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(accountData)
        }
      );
      
      console.log('Updated existing Cloudinary account');
    } else {
      // Create a new record
      upsertResponse = await fetch(
        `${supabaseUrl}/rest/v1/cloudinaryacc`,
        {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(accountData)
        }
      );
      
      console.log('Created new Cloudinary account');
    }
    
    if (!upsertResponse.ok) {
      const errorText = await upsertResponse.text();
      throw new Error(`Error creating account in database: ${upsertResponse.status} ${errorText}`);
    }
    
    const result = await upsertResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: exists ? "Cloudinary account updated" : "Cloudinary account created",
      data: result[0] || result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error upserting Cloudinary account:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}