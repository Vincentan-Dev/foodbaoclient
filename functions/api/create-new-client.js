import bcryptjs from 'bcryptjs';
import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  // Get Supabase credentials from the central module
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
  
  // Set CORS headers
  const corsHeaders = getCorsHeaders();
  
  // Handle OPTIONS requests for CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  try {
    // Parse request body
    const data = await request.json();
    
    console.log("Creating new client with data:", {
      username: data.user?.username,
      email: data.user?.email,
      client_username: data.client?.USERNAME
    });
    
    // Validate required data
    if (!data.user || !data.user.username || !data.client) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required data"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Additional validation for email uniqueness
    if (!data.user.email || data.user.email.trim() === '') {
      return new Response(JSON.stringify({
        success: false,
        message: "Email address is required and must be unique"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Check if plaintext_password was provided
    if (!data.plaintext_password) {
      return new Response(JSON.stringify({
        success: false,
        message: "Password is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Always convert username to uppercase for consistency with database schema
    const uppercaseUsername = data.user.username.toUpperCase();
    
    // Create a unified record for the userfile table combining user and client data
    const userfileRecord = {
      // User data
      USERNAME: uppercaseUsername,
      PASSWORD_HASH: await bcryptjs.hash(data.plaintext_password, 10), // Hash password securely
      EMAIL: data.user.email,
      USER_ROLE: (data.user.user_role || 'CLIENT').toUpperCase(),
      STATUS: data.client.STATUS || 'ACTIVE',
      
      // Client data
      BUSINESSNAME: data.client.BUSINESSNAME || data.client.businessname || '',
      BUSINESSCHN: data.client.BUSINESSCHN || data.client.businesschn || '',
      CLIENT_TYPE: data.client.CLIENT_TYPE || data.client.client_type || '',
      CATOGERY: data.client.CATOGERY || data.client.catogery || '',
      HAWKERID: data.client.HAWKERID || data.client.hawkerid || '',
      ADDRESS: data.client.ADDRESS || data.client.address || '',
      CITY: data.client.CITY || data.client.city || '',
      STATE: data.client.STATE || data.client.state || '',
      COUNTRY: data.client.COUNTRY || data.client.country || '',
      CONTACT_PERSON: data.client.CONTACT_PERSON || data.client.contact_person || '',
      PHONE_NUMBER: data.client.PHONE_NUMBER || data.client.phone_number || '',
      CREDIT_BALANCE: data.client.CREDIT_BALANCE || data.client.credit_balance || 0,
      DAILY_RATE: data.client.DAILY_RATE || data.client.daily_rate || 0,
      BACKGROUND_IMGURL: data.client.BACKGROUND_IMGURL || data.client.background_imgurl || '',
      BANNER_IMGURL: data.client.BANNER_IMGURL || data.client.banner_imgurl || '',
      
      // Timestamps
      CREATE_AT: new Date().toISOString(),
      CREATED_AT: new Date().toISOString(),
      UPDATED_AT: new Date().toISOString(),
      CREATED_BY: data.client.CREATED_BY || localStorage.getItem('username') || 'System',
      UPDATED_BY: data.client.UPDATED_BY || localStorage.getItem('username') || 'System'
    };
    
    console.log("Creating new userfile record:", {
      username: userfileRecord.USERNAME,
      email: userfileRecord.EMAIL,
      role: userfileRecord.USER_ROLE
    });
    
    // Create the unified record in the userfile table
    const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile`, {
      method: 'POST',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(userfileRecord)
    });
    
    // Handle error response
    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error("Error response from userfile creation:", errorText);
      
      // Parse error if possible
      try {
        const errorObj = JSON.parse(errorText);
        
        // Handle specific error codes
        if (errorObj.code === "23505") {
          if (errorObj.message.includes("userfile_email_key")) {
            return new Response(JSON.stringify({
              success: false,
              message: "This email address is already registered. Please use a different email."
            }), {
              status: 409, // Conflict status code
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          } else if (errorObj.message.includes("userfile_username_key")) {
            return new Response(JSON.stringify({
              success: false,
              message: "This username is already taken. Please choose a different username."
            }), {
              status: 409,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }
        
        console.error("Database error details:", {
          code: errorObj.code,
          message: errorObj.message,
          details: errorObj.details,
          hint: errorObj.hint
        });
      } catch (parseError) {
        // Couldn't parse the error, continue with generic error
        console.error("Could not parse error response:", parseError);
      }
      
      throw new Error(`Failed to create user record: ${errorText}`);
    }
    
    // Get the newly created user record
    const newUserfile = await createUserResponse.json();
    console.log("Created userfile record:", newUserfile[0]);
    
    // For compatibility with the existing UI, create separate user and client objects
    const newUser = {
      id: newUserfile[0].ID,
      USERNAME: newUserfile[0].USERNAME,
      EMAIL: newUserfile[0].EMAIL,
      USER_ROLE: newUserfile[0].USER_ROLE,
      STATUS: newUserfile[0].STATUS,
      CREATE_AT: newUserfile[0].CREATE_AT,
      LAST_LOGIN: newUserfile[0].LAST_LOGIN,
      CLIENT_ID: newUserfile[0].CLIENT_ID
    };
    
    const newClient = {
      CLIENT_ID: newUserfile[0].CLIENT_ID,
      USERID: newUserfile[0].ID,
      USERNAME: newUserfile[0].USERNAME,
      USER_ROLE: newUserfile[0].USER_ROLE,
      BUSINESSNAME: newUserfile[0].BUSINESSNAME,
      BUSINESSCHN: newUserfile[0].BUSINESSCHN,
      CLIENT_TYPE: newUserfile[0].CLIENT_TYPE,
      CATOGERY: newUserfile[0].CATOGERY,
      HAWKERID: newUserfile[0].HAWKERID,
      STATUS: newUserfile[0].STATUS,
      ADDRESS: newUserfile[0].ADDRESS,
      CITY: newUserfile[0].CITY,
      STATE: newUserfile[0].STATE,
      COUNTRY: newUserfile[0].COUNTRY,
      CONTACT_PERSON: newUserfile[0].CONTACT_PERSON,
      PHONE_NUMBER: newUserfile[0].PHONE_NUMBER,
      CREDIT_BALANCE: newUserfile[0].CREDIT_BALANCE,
      DAILY_RATE: newUserfile[0].DAILY_RATE,
      BACKGROUND_IMGURL: newUserfile[0].BACKGROUND_IMGURL,
      BANNER_IMGURL: newUserfile[0].BANNER_IMGURL,
      CREATED_AT: newUserfile[0].CREATED_AT,
      UPDATED_AT: newUserfile[0].UPDATED_AT,
      CREATED_BY: newUserfile[0].CREATED_BY,
      UPDATED_BY: newUserfile[0].UPDATED_BY
    };

    // Return formatted response for compatibility with existing UI
    return new Response(JSON.stringify({
      success: true,
      message: "Client created successfully",
      user: newUser,
      client: newClient
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error creating new client:', error);
    
    // Extract user-friendly message from database errors
    let userMessage = error.message;
    
    if (error.message.includes("duplicate key value")) {
      if (error.message.includes("userfile_email_key")) {
        userMessage = "This email address is already registered. Please use a different email.";
      } else if (error.message.includes("userfile_username_key")) {
        userMessage = "This username is already taken. Please choose a different username.";
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: userMessage
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}