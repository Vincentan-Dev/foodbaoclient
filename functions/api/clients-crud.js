import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Ensure we have required credentials
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Parse URL to get the client ID if present
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');
    
    // Handle request based on HTTP method
    try {
      if (request.method === "GET") {
        // Handle GET - fetch client(s)
        if (clientId) {
          return await fetchClientById(clientId, supabaseUrl, supabaseKey);
        } else {
          return await fetchClients(request, supabaseUrl, supabaseKey);
        }
      } else if (request.method === "POST") {
        // Handle POST - create new client
        return await createClientRecord(request, supabaseUrl, supabaseKey);
      } else if (request.method === "PATCH" || request.method === "PUT") {
        // Handle PATCH/PUT - update client
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            message: "Client ID required for update"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const clientData = await request.json();
        
        // Update client using the correct CLIENT_ID column name
        const response = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
          method: 'PATCH',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(clientData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Database error: ${response.status} ${errorText}`);
        }
        
        const updatedClient = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          message: "Client record updated successfully",
          client: updatedClient[0]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else if (request.method === "DELETE") {
        // Handle DELETE - delete client
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            message: "Client ID required for deletion"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        return await deleteClientRecord(clientId, supabaseUrl, supabaseKey);
      } else {
        // Method not allowed
        return new Response(JSON.stringify({
          success: false,
          message: `Method ${request.method} not allowed`
        }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (error) {
      console.error('Error in clients-crud handler:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "Server error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error in clients-crud handler:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "Server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to update client record properly
async function updateClientRecord(clientId, request, supabaseUrl, supabaseKey) {
  try {
    const clientData = await request.json();
    
    // Map clientData to database fields
    const dbFields = {
      username: clientData.username,
      businessname: clientData.businessname,
      businesschn: clientData.businesschn,
      client_type: clientData.client_type,
      catogery: clientData.catogery,
      hawkerid: clientData.hawkerid,
      status: clientData.status,
      contact_person: clientData.contact_person,
      email: clientData.email,
      phone_number: clientData.phone_number,
      address: clientData.address,
      city: clientData.city,
      state: clientData.state,
      country: clientData.country,
      credit_balance: clientData.credit_balance,
      daily_rate: clientData.daily_rate,
      updated_at: new Date().toISOString(),
      updated_by: clientData.updated_by || 'System'
    };
    
    // Update the client record in Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'PATCH',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(dbFields)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }
    
    const updatedClient = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Client record updated successfully",
      client: updatedClient[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error updating client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to fetch a client by ID
async function fetchClientById(clientId, supabaseUrl, supabaseKey) {
  try {
    // Query the userfile table directly which contains the unified user data including TABLE field
    const response = await fetch(`${supabaseUrl}/rest/v1/userfile?CLIENT_ID=eq.${clientId}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }

    const clientData = await response.json();
    
    // If no results found in userfile table, fallback to the old clients table
    if (!clientData || clientData.length === 0) {
      console.log(`Client ID ${clientId} not found in userfile table, trying clients table`);
      
      // Try the original clients table as fallback
      const fallbackResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        throw new Error(`Database error: ${fallbackResponse.status} ${errorText}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      return new Response(JSON.stringify({
        success: true,
        client: fallbackData[0],
        source: "clients_table"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Include TABLE field in the response
    const client = clientData[0];
    console.log(`Returning client data for ID ${clientId} with TABLE=${client.TABLE || client.TABLE_NUMBER || 0}`);

    return new Response(JSON.stringify({
      success: true,
      client: client,
      source: "userfile_table"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Error fetching client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to delete a client from both clients and userfile tables
async function deleteClientRecord(clientId, supabaseUrl, supabaseKey) {
  try {
    // First, get the client record to get the username
    const getResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Database error getting client: ${getResponse.status} ${errorText}`);
    }

    const clientData = await getResponse.json();
    if (!clientData || clientData.length === 0) {
      throw new Error("Client record not found");
    }

    const username = clientData[0].USERNAME;

    // Step 1: Delete from clients table
    const deleteClientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'DELETE',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!deleteClientResponse.ok) {
      const errorText = await deleteClientResponse.text();
      throw new Error(`Error deleting client record: ${deleteClientResponse.status} ${errorText}`);
    }

    // Step 2: Delete from userfile table matching the username
    const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?username=eq.${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!deleteUserResponse.ok) {
      // Log error but don't fail the whole operation
      console.error(`Warning: Could not delete userfile record: ${await deleteUserResponse.text()}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Client record and associated user deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Error deleting client and user records:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Add this function to create a client record
async function createClientRecord(request, supabaseUrl, supabaseKey) {
  try {
    const clientData = await request.json();
    console.log("Received client data:", clientData);

    const username = (clientData.username || '');
    
    // Step 1: First check if user already exists in userfile table
    const checkUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!checkUserResponse.ok) {
      const errorText = await checkUserResponse.text();
      throw new Error(`Error checking for existing user: ${checkUserResponse.status} ${errorText}`);
    }
    
    const existingUsers = await checkUserResponse.json();
    let userId;
    
    if (existingUsers && existingUsers.length > 0) {
      // User exists, get their ID
      userId = existingUsers[0].ID;
      console.log(`User ${username} already exists with ID ${userId}`);
    } else {
      // User doesn't exist, create new user record in the unified userfile table
      console.log(`Creating new user for ${username}`);
      
      // Use the password from request or default to the username if not provided
      const defaultPassword = clientData.plaintext_password || username;
      
      console.log(`Generating password hash for new user ${username} with password: ${defaultPassword.substr(0, 2)}****`);
      
      // 1. Generate PASSWORD_HASH using the RPC function
      // IMPORTANT: We must have a valid PASSWORD_HASH as it's NOT NULL in the schema
      let passwordHash = '$2a$10$defaulthashfallback12345678901234567890';  // Default fallback hash
      try {
        console.log("Starting password hash generation via RPC...");
        const passwordHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
          method: 'POST',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            password: defaultPassword
          })
        });
        
        console.log(`Password hash RPC response status: ${passwordHashResponse.status}`);
        
        if (!passwordHashResponse.ok) {
          const errorText = await passwordHashResponse.text();
          console.error(`Error in password hash RPC: ${errorText}`);
          console.warn("Using fallback password hash due to RPC error");
        } else {
          // Get the raw response text
          const rawPasswordHashText = await passwordHashResponse.text();
          console.log("Raw password hash response:", rawPasswordHashText);
          
          // Process the response
          if (rawPasswordHashText && rawPasswordHashText.length > 0) {
            passwordHash = rawPasswordHashText;
            
            // Remove quotes if the response is wrapped in quotes
            if (passwordHash.startsWith('"') && passwordHash.endsWith('"')) {
              console.log("Password hash has quotes, parsing JSON");
              passwordHash = JSON.parse(passwordHash);
            }
            
            console.log(`Final password hash (length: ${passwordHash.length}):`);
            console.log(`Hash prefix: ${passwordHash.substring(0, 10)}...`);
            console.log(`Hash suffix: ...${passwordHash.substring(passwordHash.length - 10)}`);
            console.log(`Is likely bcrypt hash: ${passwordHash.startsWith('$2')}`);
          } else {
            console.warn("Empty password hash returned from RPC, using fallback");
          }
        }
      } catch (hashError) {
        console.error('Failed to generate password hash:', hashError);
        console.warn("Using fallback password hash due to error");
      }
      
      // 2. Generate USERNAME_HASH using the same RPC function
      // USERNAME_HASH can be null according to schema, but we'll try to populate it
      let usernameHash = null;
      try {
        console.log("Starting username hash generation via RPC...");
        const usernameHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
          method: 'POST',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            password: username
          })
        });
        
        console.log(`Username hash RPC response status: ${usernameHashResponse.status}`);
        
        if (!usernameHashResponse.ok) {
          const errorText = await usernameHashResponse.text();
          console.error(`Error in username hash RPC: ${errorText}`);
          // USERNAME_HASH can be null, so no fallback needed
        } else {
          // Get the raw response text
          const rawUsernameHashText = await usernameHashResponse.text();
          console.log("Raw username hash response:", rawUsernameHashText);
          
          // Process the response if not empty
          if (rawUsernameHashText && rawUsernameHashText.length > 0) {
            usernameHash = rawUsernameHashText;
            
            // Remove quotes if the response is wrapped in quotes
            if (usernameHash.startsWith('"') && usernameHash.endsWith('"')) {
              console.log("Username hash has quotes, parsing JSON");
              usernameHash = JSON.parse(usernameHash);
            }
            
            console.log(`Final username hash (length: ${usernameHash.length}):`);
            console.log(`Hash prefix: ${usernameHash.substring(0, 10)}...`);
            console.log(`Hash suffix: ...${usernameHash.substring(usernameHash.length - 10)}`);
            console.log(`Is likely bcrypt hash: ${usernameHash.startsWith('$2')}`);
          }
        }
      } catch (hashError) {
        console.error('Failed to generate username hash:', hashError);
        // USERNAME_HASH can be null, so we continue
      }
      
      // Ensure PASSWORD_HASH is valid and not empty (required by schema)
      if (!passwordHash || passwordHash === '' || typeof passwordHash !== 'string') {
        console.warn("Invalid password hash, using fallback value");
        passwordHash = '$2a$10$defaulthashfallback12345678901234567890';
      }
      
      // Prepare user data - using the unified structure
      const userData = {
        "USERNAME": username,
        "PASSWORD_HASH": passwordHash,  // Required field, cannot be null
        "USERNAME_HASH": usernameHash,  // Can be null according to schema
        "USER_ROLE": (clientData.user_role || "CLIENT"),
        "EMAIL": clientData.email || "",
        "STATUS": clientData.status || "ACTIVE",
        
        // Client fields
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
          // New fields added
        "EXP_DATE": (() => {
          // Date format handling for PostgreSQL (should be YYYY-MM-DD)
          const expDate = clientData.exp_date || null;
          if (expDate) {
            console.log(`Received EXP_DATE: ${expDate}`);
            // Validate that it's in PostgreSQL acceptable format (YYYY-MM-DD)
            const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(expDate);
            if (!isValidFormat) {
              console.warn(`EXP_DATE not in YYYY-MM-DD format: ${expDate}. Using null instead.`);
              return null;
            }
          }
          return expDate;
        })(),
        "ID_NO": clientData.id_no || "",
        "SST": clientData.sst || 0,
        "SALES_TAX": clientData.sales_tax || 0,
        "TABLE": clientData.table || 0,
        "PIN_NO": clientData.pin_no || "",
        "COMPANY_REGNO": clientData.company_regno || "",
        
        // Audit fields
        "CREATED_AT": new Date().toISOString(),
        "CREATED_BY": clientData.updated_by || "System",
        "UPDATED_AT": new Date().toISOString(),
        "UPDATED_BY": clientData.updated_by || "System"
      };
      
      // Log detailed info about the user data being sent to Supabase
      console.log("Creating user with data:", {
        username: userData.USERNAME,
        email: userData.EMAIL,
        role: userData.USER_ROLE,
        hasPasswordHash: !!userData.PASSWORD_HASH,
        hasUsernameHash: !!userData.USERNAME_HASH,
        passwordHashLength: userData.PASSWORD_HASH ? userData.PASSWORD_HASH.length : 0,
        usernameHashLength: userData.USERNAME_HASH ? userData.USERNAME_HASH.length : 0
      });
      
      // Show a redacted version of the actual hash values for debugging
      if (userData.PASSWORD_HASH) {
        console.log("PASSWORD_HASH field value (redacted):", 
          `${userData.PASSWORD_HASH.substring(0, 15)}...${userData.PASSWORD_HASH.substring(userData.PASSWORD_HASH.length - 15)}`);
      } else {
        console.log("WARNING: PASSWORD_HASH is empty or invalid!");
      }
      
      if (userData.USERNAME_HASH) {
        console.log("USERNAME_HASH field value (redacted):", 
          `${userData.USERNAME_HASH.substring(0, 15)}...${userData.USERNAME_HASH.substring(userData.USERNAME_HASH.length - 15)}`);
      } else {
        console.log("Note: USERNAME_HASH is null (allowed by schema)");
      }
      
      // Create the user in userfile table
      console.log(`Sending POST request to ${supabaseUrl}/rest/v1/userfile`);
      const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(userData)
      });
      
      console.log(`Create user response status: ${createUserResponse.status}`);
        if (!createUserResponse.ok) {
        const errorText = await createUserResponse.text();
        console.error(`Error creating user: ${errorText}`);
        
        // Detailed error logging for date format issues
        if (errorText.includes("22008") || errorText.includes("date/time field value out of range")) {
          console.error("PostgreSQL date error detected. Original exp_date value:", clientData.exp_date);
          console.error("Formatted exp_date value sent to database:", userData.EXP_DATE);
          throw new Error(`Error creating user: ${createUserResponse.status} ${errorText} - Please ensure date is in YYYY-MM-DD format`);
        }
        
        throw new Error(`Error creating user: ${createUserResponse.status} ${errorText}`);
      }
      
      const newUser = await createUserResponse.json();
      userId = newUser[0].ID;
      
      console.log(`Created new user with ID ${userId}`);
      
      // Verify the hash was stored correctly by fetching the new user record
      console.log("Verifying hash storage by fetching the newly created user record...");
      const verifyUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?ID=eq.${userId}`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (verifyUserResponse.ok) {
        const verifiedUser = await verifyUserResponse.json();
        if (verifiedUser && verifiedUser.length > 0) {
          console.log("Verification of newly created user:");
          console.log(`- Has PASSWORD_HASH: ${!!verifiedUser[0].PASSWORD_HASH}`);
          console.log(`- Has USERNAME_HASH: ${!!verifiedUser[0].USERNAME_HASH}`);
          console.log(`- PASSWORD_HASH length: ${verifiedUser[0].PASSWORD_HASH ? verifiedUser[0].PASSWORD_HASH.length : 0}`);
          console.log(`- USERNAME_HASH length: ${verifiedUser[0].USERNAME_HASH ? verifiedUser[0].USERNAME_HASH.length : 0}`);
          
          if (!verifiedUser[0].PASSWORD_HASH) {
            console.warn("WARNING: PASSWORD_HASH not stored properly in the database!");
          }
        }
      }
    }
    
    // Return the user data as the response
    const getUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?ID=eq.${userId}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!getUserResponse.ok) {
      const errorText = await getUserResponse.text();
      throw new Error(`Error fetching user data: ${getUserResponse.status} ${errorText}`);
    }
    
    const userData = await getUserResponse.json();
    
    if (!userData || userData.length === 0) {
      throw new Error("Failed to retrieve user data after creation");
    }
    
    // Log the returned data for debugging
    console.log("Final user record stored in database:");
    console.log(`- Has PASSWORD_HASH in response: ${!!userData[0].PASSWORD_HASH}`);
    console.log(`- Has USERNAME_HASH in response: ${!!userData[0].USERNAME_HASH}`);
    console.log(`- PASSWORD_HASH length in response: ${userData[0].PASSWORD_HASH ? userData[0].PASSWORD_HASH.length : 0}`);
    console.log(`- USERNAME_HASH length in response: ${userData[0].USERNAME_HASH ? userData[0].USERNAME_HASH.length : 0}`);
    
    // Format response with client data structure for UI compatibility
    return new Response(JSON.stringify({
      success: true,
      message: "Client created successfully",
      data: {
        user: {
          id: userData[0].ID,
          username: userData[0].USERNAME,
          email: userData[0].EMAIL,
          role: userData[0].USER_ROLE,
          status: userData[0].STATUS
        },
        client: {
          CLIENT_ID: userData[0].CLIENT_ID,
          USERID: userData[0].ID,
          USERNAME: userData[0].USERNAME,
          USER_ROLE: userData[0].USER_ROLE,
          BUSINESSNAME: userData[0].BUSINESSNAME,
          BUSINESSCHN: userData[0].BUSINESSCHN,
          CLIENT_TYPE: userData[0].CLIENT_TYPE,
          CATOGERY: userData[0].CATOGERY,
          HAWKERID: userData[0].HAWKERID,
          STATUS: userData[0].STATUS,
          ADDRESS: userData[0].ADDRESS,
          CITY: userData[0].CITY,
          STATE: userData[0].STATE,
          COUNTRY: userData[0].COUNTRY,
          CONTACT_PERSON: userData[0].CONTACT_PERSON,
          EMAIL: userData[0].EMAIL,
          PHONE_NUMBER: userData[0].PHONE_NUMBER,
          CREDIT_BALANCE: userData[0].CREDIT_BALANCE,
          DAILY_RATE: userData[0].DAILY_RATE,
          BACKGROUND_IMGURL: userData[0].BACKGROUND_IMGURL,
          BANNER_IMGURL: userData[0].BANNER_IMGURL,
          // Include new fields in response
          EXP_DATE: userData[0].EXP_DATE,
          ID_NO: userData[0].ID_NO,
          SST: userData[0].SST,
          SALES_TAX: userData[0].SALES_TAX,
          TABLE: userData[0].TABLE,
          PIN_NO: userData[0].PIN_NO,
          COMPANY_REGNO: userData[0].COMPANY_REGNO,
          UPDATED_AT: userData[0].UPDATED_AT,
          CREATED_AT: userData[0].CREATED_AT,
          CREATED_BY: userData[0].CREATED_BY,
          UPDATED_BY: userData[0].UPDATED_BY
        }
      }
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  } catch (error) {
    console.error('Error creating client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while creating the client"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
}