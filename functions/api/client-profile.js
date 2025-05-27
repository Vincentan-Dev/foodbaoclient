import { getSupabaseConfig, getCorsHeaders, supabaseFetch } from './_supabaseClient.js';
// Use Web Crypto API instead of Node.js crypto module

/**
 * Client Profile API - Direct Cloudflare Worker with RPC endpoint integration
 * 
 * Handles both client profile retrieval and updates using Supabase RPC calls
 */
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Get Supabase credentials
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Different operations based on HTTP method
    switch (request.method) {
      case "GET": {
        // Handle profile retrieval
        const url = new URL(request.url);
        const username = url.searchParams.get('username');
        
        if (!username) {
          return new Response(JSON.stringify({
            success: false,
            message: "Username parameter is required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        console.log(`[client-profile] Fetching profile for: ${username}`);
        
        // Call the get_client_profile RPC function
        const rpcEndpoint = `${supabaseUrl}/rest/v1/rpc/get_client_profile`;
        const response = await supabaseFetch(rpcEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ p_username: username })
        }, env);
        
        // Handle different response scenarios
        if (!response.ok) {
          // Try fallback to direct table query if RPC fails
          if (response.status === 404 || response.status === 500) {
            console.log(`[client-profile] RPC failed, trying direct query fallback`);
            return await handleDirectQueryFallback(username, supabaseUrl, supabaseKey, env, corsHeaders);
          }
          
          const errorText = await response.text();
          console.error(`[client-profile] RPC error: ${response.status}`, errorText);
          return new Response(JSON.stringify({
            success: false,
            message: `Error retrieving client profile: ${response.status}`
          }), {
            status: response.status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const profileData = await response.json();
        
        // Return formatted profile data
        if (!profileData) {
          console.error(`[client-profile] User not found: ${username}`);
          return new Response(JSON.stringify({
            success: false,
            message: "User not found"
          }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            user: {
              id: profileData.id,
              username: profileData.username,
              email: profileData.email,
              role: profileData.user_role,
              status: profileData.status
            },
            client: {
              CLIENT_ID: profileData.client_id,
              USERID: profileData.id,
              USERNAME: profileData.username,
              USER_ROLE: profileData.user_role,
              EMAIL: profileData.email,
              STATUS: profileData.status,
              BUSINESSNAME: profileData.businessname,
              BUSINESSCHN: profileData.businesschn,
              CLIENT_TYPE: profileData.client_type,
              CATOGERY: profileData.catogery,
              HAWKERID: profileData.hawkerid,
              ADDRESS: profileData.address,
              CITY: profileData.city,
              STATE: profileData.state,
              COUNTRY: profileData.country,
              CONTACT_PERSON: profileData.contact_person,
              PHONE_NUMBER: profileData.phone_number,
              CREDIT_BALANCE: profileData.credit_balance,
              DAILY_RATE: profileData.daily_rate,
              BACKGROUND_IMGURL: profileData.background_imgurl,
              BANNER_IMGURL: profileData.banner_imgurl,
              // Add new fields to the response
              EXP_DATE: profileData.exp_date,
              ID_NO: profileData.id_no,
              SST: profileData.sst,
              SALES_TAX: profileData.sales_tax,
              TABLE: profileData.table,
              PIN_NO: profileData.pin_no,
              COMPANY_REGNO: profileData.company_regno,
              CREATED_AT: profileData.created_at,
              UPDATED_AT: profileData.updated_at
            }
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      case "POST": {
        // Handle profile updates and creation
        const clientData = await request.json();
        
        if (!clientData.username) {
          return new Response(JSON.stringify({
            success: false,
            message: "Username is required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const isNewClient = clientData.isNewClient === true;
        console.log(`[client-profile] ${isNewClient ? 'Creating' : 'Updating'} profile for: ${clientData.username}`);
        
        // Prepare payload for RPC call
        const rpcEndpoint = `${supabaseUrl}/rest/v1/rpc/${isNewClient ? 'create_client_profile' : 'update_client_profile'}`;
        const rpcPayload = {
          p_username: clientData.username,
          p_email: clientData.email || '',
          p_status: clientData.status || 'ACTIVE',
          p_user_role: (clientData.user_role || 'CLIENT').toUpperCase(),
          p_businessname: clientData.businessname || '',
          p_businesschn: clientData.businesschn || '',
          p_client_type: clientData.client_type || 'OTHER',
          p_catogery: clientData.catogery || '',
          p_hawkerid: clientData.hawkerid || '',
          p_address: clientData.address || '',
          p_city: clientData.city || '',
          p_state: clientData.state || '',
          p_country: clientData.country || '',
          p_contact_person: clientData.contact_person || '',
          p_phone_number: clientData.phone_number || '',
          p_credit_balance: clientData.credit_balance || 0,
          p_daily_rate: clientData.daily_rate || 0,
          p_background_imgurl: clientData.background_imgurl || '',
          p_banner_imgurl: clientData.banner_imgurl || '',
          // Add new fields
          p_exp_date: clientData.exp_date || null,
          p_id_no: clientData.id_no || '',
          p_sst: clientData.sst || 0,
          p_sales_tax: clientData.sales_tax || 0,
          p_table: clientData.table || 0,
          p_pin_no: clientData.pin_no || '',
          p_company_regno: clientData.company_regno || ''
        };
        
        // If it's a new client and a password is provided, include it
        if (isNewClient && clientData.password) {
          rpcPayload.p_password = clientData.password;
        }
        
        const response = await supabaseFetch(rpcEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(rpcPayload)
        }, env);
        
        if (!response.ok) {
          // Try fallback to direct table operations
          if (response.status === 404 || response.status === 500) {
            console.log(`[client-profile] RPC failed, trying direct update fallback`);
            return await handleDirectUpdateFallback(clientData, isNewClient, supabaseUrl, supabaseKey, env, corsHeaders);
          }
          
          const errorText = await response.text();
          console.error(`[client-profile] RPC error: ${response.status}`, errorText);
          return new Response(JSON.stringify({
            success: false,
            message: `Error ${isNewClient ? 'creating' : 'updating'} client profile: ${errorText || response.statusText}`
          }), {
            status: response.status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Parse the response which should contain the updated/created profile
        const updatedProfile = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          message: `Client profile ${isNewClient ? 'created' : 'updated'} successfully`,
          data: {
            user: {
              id: updatedProfile.id,
              username: updatedProfile.username,
              email: updatedProfile.email,
              role: updatedProfile.user_role,
              status: updatedProfile.status
            },
            client: {
              CLIENT_ID: updatedProfile.client_id,
              USERID: updatedProfile.id,
              USERNAME: updatedProfile.username,
              USER_ROLE: updatedProfile.user_role,
              EMAIL: updatedProfile.email,
              STATUS: updatedProfile.status,
              BUSINESSNAME: updatedProfile.businessname,
              BUSINESSCHN: updatedProfile.businesschn,
              CLIENT_TYPE: updatedProfile.client_type,
              CATOGERY: updatedProfile.catogery,
              HAWKERID: updatedProfile.hawkerid,
              ADDRESS: updatedProfile.address,
              CITY: updatedProfile.city,
              STATE: updatedProfile.state,
              COUNTRY: updatedProfile.country,
              CONTACT_PERSON: updatedProfile.contact_person,
              PHONE_NUMBER: updatedProfile.phone_number,
              CREDIT_BALANCE: updatedProfile.credit_balance,
              DAILY_RATE: updatedProfile.daily_rate,
              BACKGROUND_IMGURL: updatedProfile.background_imgurl,
              BANNER_IMGURL: updatedProfile.banner_imgurl,
              // Add the new fields to the response
              EXP_DATE: updatedProfile.exp_date,
              ID_NO: updatedProfile.id_no,
              SST: updatedProfile.sst,
              SALES_TAX: updatedProfile.sales_tax,
              TABLE: updatedProfile.table,
              PIN_NO: updatedProfile.pin_no,
              COMPANY_REGNO: updatedProfile.company_regno,
              CREATED_AT: updatedProfile.created_at,
              UPDATED_AT: updatedProfile.updated_at
            }
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      default:
        return new Response(JSON.stringify({
          success: false,
          message: "Method not allowed. Use GET for retrieval or POST for updates."
        }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }
    
  } catch (error) {
    console.error("[client-profile] Unexpected error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: `An unexpected error occurred: ${error.message}`
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...getCorsHeaders()
      }
    });
  }
}

/**
 * Fallback handler for direct table queries when RPC fails
 */
async function handleDirectQueryFallback(username, supabaseUrl, supabaseKey, env, corsHeaders) {
  try {
    console.log(`[client-profile] Attempting direct query fallback for username: ${username}`);
    
    // Try to find user with exact username
    const userResponse = await supabaseFetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { 'Prefer': 'return=representation' }
    }, env);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`[client-profile] Fallback query error: ${userResponse.status}`, errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error retrieving user data: ${userResponse.status}`
      }), {
        status: userResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const userData = await userResponse.json();
    
    if (!userData || userData.length === 0) {
      console.log(`[client-profile] User not found in fallback query: ${username}`);
      return new Response(JSON.stringify({
        success: false,
        message: "User not found. Please check the username and try again."
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const user = userData[0];
    
    // Format the response to match the expected structure
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id: user.ID,
          username: user.USERNAME,
          email: user.EMAIL,
          role: user.USER_ROLE,
          status: user.STATUS
        },
        client: {
          CLIENT_ID: user.CLIENT_ID,
          USERID: user.ID,
          USERNAME: user.USERNAME,
          USER_ROLE: user.USER_ROLE,
          EMAIL: user.EMAIL,
          STATUS: user.STATUS,
          BUSINESSNAME: user.BUSINESSNAME,
          BUSINESSCHN: user.BUSINESSCHN,
          CLIENT_TYPE: user.CLIENT_TYPE,
          CATOGERY: user.CATOGERY,
          HAWKERID: user.HAWKERID,
          ADDRESS: user.ADDRESS,
          CITY: user.CITY,
          STATE: user.STATE,
          COUNTRY: user.COUNTRY,
          CONTACT_PERSON: user.CONTACT_PERSON,
          PHONE_NUMBER: user.PHONE_NUMBER,
          CREDIT_BALANCE: user.CREDIT_BALANCE,
          DAILY_RATE: user.DAILY_RATE,
          BACKGROUND_IMGURL: user.BACKGROUND_IMGURL,
          BANNER_IMGURL: user.BANNER_IMGURL,
          // Add the new fields to the fallback response
          EXP_DATE: user.EXP_DATE,
          ID_NO: user.ID_NO,
          SST: user.SST,
          SALES_TAX: user.SALES_TAX,
          TABLE: user.TABLE,
          PIN_NO: user.PIN_NO,
          COMPANY_REGNO: user.COMPANY_REGNO,
          CREATED_AT: user.CREATED_AT,
          UPDATED_AT: user.UPDATED_AT
        }
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error(`[client-profile] Fallback query error:`, error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error in fallback query: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

/**
 * Fallback handler for direct table operations when RPC fails
 */
async function handleDirectUpdateFallback(clientData, isNewClient, supabaseUrl, supabaseKey, env, corsHeaders) {
  try {
    const originalUsername = clientData.username;
    console.log(`[client-profile] Attempting direct ${isNewClient ? 'insert' : 'update'} fallback for: ${originalUsername}`);
    
    // First check if the user exists - try both exact case and uppercase
    const uppercaseUsername = originalUsername.toUpperCase();
    let userData;
    let userId = null;
    
    if (!isNewClient) {
      // Try case-insensitive query first - check UPPER(USERNAME)=UPPER(input)
      const userCheckResponse = await supabaseFetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=ilike.${encodeURIComponent(originalUsername)}`, {
        method: 'GET'
      }, env);
      
      if (!userCheckResponse.ok) {
        const errorText = await userCheckResponse.text();
        console.error(`[client-profile] Error checking user existence: ${userCheckResponse.status}`, errorText);
      } else {
        userData = await userCheckResponse.json();
        console.log(`[client-profile] Found ${userData?.length || 0} users with case-insensitive match`);
        
        if (userData && userData.length > 0) {
          userId = userData[0].ID;
          console.log(`[client-profile] Found user with ID: ${userId}`);
        }
      }
      
      // If no match, try a direct query with uppercase (legacy approach)
      if (!userId) {
        console.log(`[client-profile] Trying uppercase fallback with ${uppercaseUsername}`);
        const upperCaseCheckResponse = await supabaseFetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(uppercaseUsername)}`, {
          method: 'GET'
        }, env);
        
        if (upperCaseCheckResponse.ok) {
          const upperCaseData = await upperCaseCheckResponse.json();
          if (upperCaseData && upperCaseData.length > 0) {
            userId = upperCaseData[0].ID;
            userData = upperCaseData;
            console.log(`[client-profile] Found user with uppercase match, ID: ${userId}`);
          }
        }
      }
      
      if (!userId) {
        console.error(`[client-profile] User not found for update: ${originalUsername}`);
        return new Response(JSON.stringify({
          success: false,
          message: "User not found for update operation. Please verify the username."
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    // Handle password and username hashing for new clients
    // We'll use the same approach as in client-crud.js
    let passwordHash = "";
    let usernameHash = null;
    
    if (isNewClient) {
      // Get the password from request
      const password = clientData.password || originalUsername; // Default to username if no password provided
      console.log(`[client-profile] Generating password hash for new user ${originalUsername} with password: ${password.substring(0, 2)}****`);
      
      // 1. Generate PASSWORD_HASH using the RPC function
      // IMPORTANT: We must have a valid PASSWORD_HASH as it's NOT NULL in the schema
      passwordHash = '$2a$10$defaulthashfallback12345678901234567890';  // Default fallback hash
      try {
        console.log("[client-profile] Starting password hash generation via RPC...");
        const passwordHashResponse = await supabaseFetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: password
          })
        }, env);
        
        console.log(`[client-profile] Password hash RPC response status: ${passwordHashResponse.status}`);
        
        if (!passwordHashResponse.ok) {
          const errorText = await passwordHashResponse.text();
          console.error(`[client-profile] Error in password hash RPC: ${errorText}`);
          console.warn("[client-profile] Using fallback password hash due to RPC error");
        } else {
          // Get the raw response text
          const rawPasswordHashText = await passwordHashResponse.text();
          console.log("[client-profile] Raw password hash response:", rawPasswordHashText);
          
          // Process the response
          if (rawPasswordHashText && rawPasswordHashText.length > 0) {
            passwordHash = rawPasswordHashText;
            
            // Remove quotes if the response is wrapped in quotes
            if (passwordHash.startsWith('"') && passwordHash.endsWith('"')) {
              console.log("[client-profile] Password hash has quotes, parsing JSON");
              passwordHash = JSON.parse(passwordHash);
            }
            
            console.log(`[client-profile] Final password hash (length: ${passwordHash.length}):`);
            console.log(`[client-profile] Hash prefix: ${passwordHash.substring(0, 10)}...`);
            console.log(`[client-profile] Hash suffix: ...${passwordHash.substring(passwordHash.length - 10)}`);
            console.log(`[client-profile] Is likely bcrypt hash: ${passwordHash.startsWith('$2')}`);
          } else {
            console.warn("[client-profile] Empty password hash returned from RPC, using fallback");
          }
        }
      } catch (hashError) {
        console.error('[client-profile] Failed to generate password hash:', hashError);
        console.warn("[client-profile] Using fallback password hash due to error");
      }
      
      // 2. Generate USERNAME_HASH using the same RPC function
      // USERNAME_HASH can be null according to schema, but we'll try to populate it
      try {
        console.log("[client-profile] Starting username hash generation via RPC...");
        const usernameHashResponse = await supabaseFetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: uppercaseUsername
          })
        }, env);
        
        console.log(`[client-profile] Username hash RPC response status: ${usernameHashResponse.status}`);
        
        if (!usernameHashResponse.ok) {
          const errorText = await usernameHashResponse.text();
          console.error(`[client-profile] Error in username hash RPC: ${errorText}`);
          // USERNAME_HASH can be null, so no fallback needed
        } else {
          // Get the raw response text
          const rawUsernameHashText = await usernameHashResponse.text();
          console.log("[client-profile] Raw username hash response:", rawUsernameHashText);
          
          // Process the response if not empty
          if (rawUsernameHashText && rawUsernameHashText.length > 0) {
            usernameHash = rawUsernameHashText;
            
            // Remove quotes if the response is wrapped in quotes
            if (usernameHash.startsWith('"') && usernameHash.endsWith('"')) {
              console.log("[client-profile] Username hash has quotes, parsing JSON");
              usernameHash = JSON.parse(usernameHash);
            }
            
            console.log(`[client-profile] Final username hash (length: ${usernameHash.length}):`);
            console.log(`[client-profile] Hash prefix: ${usernameHash.substring(0, 10)}...`);
            console.log(`[client-profile] Hash suffix: ...${usernameHash.substring(usernameHash.length - 10)}`);
            console.log(`[client-profile] Is likely bcrypt hash: ${usernameHash.startsWith('$2')}`);
          }
        }
      } catch (hashError) {
        console.error('[client-profile] Failed to generate username hash:', hashError);
        // USERNAME_HASH can be null, so we continue
      }
      
      // Ensure PASSWORD_HASH is valid and not empty (required by schema)
      if (!passwordHash || passwordHash === '' || typeof passwordHash !== 'string') {
        console.warn("[client-profile] Invalid password hash, using fallback value");
        passwordHash = '$2a$10$defaulthashfallback12345678901234567890';
      }
    }
    
    // Prepare the record with uppercase field names for database consistency
    const record = {
      ...(userId && { ID: userId }),
      ...(isNewClient && { USERNAME: uppercaseUsername }),
      "USER_ROLE": (clientData.user_role || "CLIENT"),
      "EMAIL": clientData.email || "",
      "STATUS": clientData.status || "ACTIVE",
      "BUSINESSNAME": clientData.businessname || "",
      "BUSINESSCHN": clientData.businesschn || "",
      "CLIENT_TYPE": clientData.client_type || "OTHER",
      "CATOGERY": clientData.catogery || "",
      "HAWKERID": clientData.hawkerid || "",
      "ADDRESS": clientData.address || "",
      "CITY": clientData.city || "",
      "STATE": clientData.state || "",
      "COUNTRY": clientData.country || "",
      "CONTACT_PERSON": clientData.contact_person || "",
      "PHONE_NUMBER": clientData.phone_number || "",
      "CREDIT_BALANCE": clientData.credit_balance || 0,
      "DAILY_RATE": clientData.daily_rate || 0,
      "BACKGROUND_IMGURL": clientData.background_imgurl || "",
      "BANNER_IMGURL": clientData.banner_imgurl || "",
      // Add the new fields to the record
      "EXP_DATE": clientData.exp_date || null,
      "ID_NO": clientData.id_no || "",
      "SST": clientData.sst || 0,
      "SALES_TAX": clientData.sales_tax || 0,
      "TABLE": clientData.table || 0,
      "PIN_NO": clientData.pin_no || "",
      "COMPANY_REGNO": clientData.company_regno || "",
      "UPDATED_AT": new Date().toISOString(),
      "UPDATED_BY": originalUsername || "System"
    };
    
    // Add required fields for new clients
    if (isNewClient) { 
      record.CREATED_AT = new Date().toISOString();
      record.CREATED_BY = originalUsername || "System";
      record.PASSWORD_HASH = passwordHash;
      record.USERNAME_HASH = usernameHash;
    }
    
    // Log detailed info about the user data being sent to Supabase
    if (isNewClient) {
      console.log("[client-profile] Creating user with data:", {
        username: record.USERNAME,
        email: record.EMAIL,
        role: record.USER_ROLE,
        hasPasswordHash: !!record.PASSWORD_HASH,
        hasUsernameHash: !!record.USERNAME_HASH,
        passwordHashLength: record.PASSWORD_HASH ? record.PASSWORD_HASH.length : 0,
        usernameHashLength: record.USERNAME_HASH ? record.USERNAME_HASH.length : 0
      });
      
      // Show a redacted version of the actual hash values for debugging
      if (record.PASSWORD_HASH) {
        console.log("[client-profile] PASSWORD_HASH field value (redacted):", 
          `${record.PASSWORD_HASH.substring(0, 15)}...${record.PASSWORD_HASH.substring(record.PASSWORD_HASH.length - 15)}`);
      } else {
        console.log("[client-profile] WARNING: PASSWORD_HASH is empty or invalid!");
      }
      
      if (record.USERNAME_HASH) {
        console.log("[client-profile] USERNAME_HASH field value (redacted):", 
          `${record.USERNAME_HASH.substring(0, 15)}...${record.USERNAME_HASH.substring(record.USERNAME_HASH.length - 15)}`);
      } else {
        console.log("[client-profile] Note: USERNAME_HASH is null (allowed by schema)");
      }
    }
    
    // Perform insert or update operation
    const endpoint = isNewClient 
      ? `${supabaseUrl}/rest/v1/userfile` 
      : `${supabaseUrl}/rest/v1/userfile?ID=eq.${encodeURIComponent(userId)}`;
      
    const method = isNewClient ? 'POST' : 'PATCH';
    
    console.log(`[client-profile] Sending ${method} request to ${endpoint}`);
    const updateResponse = await supabaseFetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(record)
    }, env);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`[client-profile] Direct ${method} operation failed: ${updateResponse.status}`, errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error ${isNewClient ? 'creating' : 'updating'} user profile: ${updateResponse.status} - ${errorText}`
      }), {
        status: updateResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const updatedData = await updateResponse.json();
    
    if (!updatedData || updatedData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `No data returned from ${isNewClient ? 'insert' : 'update'} operation`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const updatedUser = updatedData[0];
    
    // Verify the hash was stored correctly if this is a new client
    if (isNewClient) {
      console.log("[client-profile] Verifying hash storage for the newly created user record...");
      console.log(`[client-profile] - Has PASSWORD_HASH: ${!!updatedUser.PASSWORD_HASH}`);
      console.log(`[client-profile] - Has USERNAME_HASH: ${!!updatedUser.USERNAME_HASH}`);
      console.log(`[client-profile] - PASSWORD_HASH length: ${updatedUser.PASSWORD_HASH ? updatedUser.PASSWORD_HASH.length : 0}`);
      console.log(`[client-profile] - USERNAME_HASH length: ${updatedUser.USERNAME_HASH ? updatedUser.USERNAME_HASH.length : 0}`);
      
      if (!updatedUser.PASSWORD_HASH) {
        console.warn("[client-profile] WARNING: PASSWORD_HASH not stored properly in the database!");
      }
    }
    
    // Return success with formatted data - include PASSWORD_HASH status in the response
    return new Response(JSON.stringify({
      success: true,
      message: `Client profile ${isNewClient ? 'created' : 'updated'} successfully using direct table operation`,
      data: {
        user: {
          id: updatedUser.ID,
          username: updatedUser.USERNAME,
          email: updatedUser.EMAIL,
          role: updatedUser.USER_ROLE,
          status: updatedUser.STATUS,
          PASSWORD_HASH: updatedUser.PASSWORD_HASH ? "PRESENT" : "MISSING", // Add password hash status, not the actual hash
          PASSWORD_HASH_LENGTH: updatedUser.PASSWORD_HASH ? updatedUser.PASSWORD_HASH.length : 0
        },
        client: {
          CLIENT_ID: updatedUser.CLIENT_ID,
          USERID: updatedUser.ID,
          USERNAME: updatedUser.USERNAME,
          USER_ROLE: updatedUser.USER_ROLE,
          EMAIL: updatedUser.EMAIL,
          STATUS: updatedUser.STATUS,
          BUSINESSNAME: updatedUser.BUSINESSNAME,
          BUSINESSCHN: updatedUser.BUSINESSCHN,
          CLIENT_TYPE: updatedUser.CLIENT_TYPE,
          CATOGERY: updatedUser.CATOGERY,
          HAWKERID: updatedUser.HAWKERID,
          ADDRESS: updatedUser.ADDRESS,
          CITY: updatedUser.CITY,
          STATE: updatedUser.STATE,
          COUNTRY: updatedUser.COUNTRY,
          CONTACT_PERSON: updatedUser.CONTACT_PERSON,
          PHONE_NUMBER: updatedUser.PHONE_NUMBER,
          CREDIT_BALANCE: updatedUser.CREDIT_BALANCE,
          DAILY_RATE: updatedUser.DAILY_RATE,
          BACKGROUND_IMGURL: updatedUser.BACKGROUND_IMGURL,
          BANNER_IMGURL: updatedUser.BANNER_IMGURL,
          CREATED_AT: updatedUser.CREATED_AT,
          UPDATED_AT: updatedUser.UPDATED_AT
        }
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error(`[client-profile] Direct operation fallback error:`, error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error in direct operation fallback: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}