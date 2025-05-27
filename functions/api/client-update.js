import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

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
    
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed. Use POST."
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get client data from request body
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
    
    console.log("Updating client for username:", clientData.username);
    
    // Ensure username is uppercase for consistency
    const uppercaseUsername = clientData.username.toUpperCase();
    
    // Save USER_ROLE for later use - ensure it's uppercase
    const userRole = (clientData.user_role || "CLIENT").toUpperCase();
    
    console.log("Setting user role to:", userRole);
    console.log("Looking for user with username:", uppercaseUsername);
    
    // First try searching with the exact case provided
    console.log("First trying exact username search");
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(clientData.username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    // Get initial results to check
    let userData;
    try {
      userData = await userResponse.json();
    } catch (error) {
      console.error("Error parsing initial user response:", error);
      userData = [];
    }
    
    // If no results with exact case, try with uppercase
    if (!userData || userData.length === 0) {
      console.log("Exact case search failed, trying uppercase search");
      const upperCaseResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(uppercaseUsername)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!upperCaseResponse.ok) {
        const errorText = await upperCaseResponse.text();
        console.error(`Failed to fetch userfile record: ${errorText}`);
        return new Response(JSON.stringify({
          success: false,
          message: `Error fetching user: ${upperCaseResponse.status} - ${errorText}`
        }), {
          status: upperCaseResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      userData = await upperCaseResponse.json();
    }
    
    // As a last resort, try an ILIKE search (case-insensitive)
    if (!userData || userData.length === 0) {
      console.log("Uppercase search failed, trying case-insensitive search");
      const caseInsensitiveResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=ilike.${encodeURIComponent(clientData.username)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      userData = await caseInsensitiveResponse.json();
    }
    
    // Check if this is a new user create request (if user not found)
    let userId;
    if (!userData || userData.length === 0) {
      // Check if this is a new user request 
      const isNewUser = !clientData.ID && clientData.username;
      
      if (isNewUser) {
        console.log("User not found, creating new user:", clientData.username);
        
        // Use provided password or default
        let passwordHash;
        const newPassword = clientData.plaintext_password || clientData.new_password;
        
        if (newPassword) {
          // Generate bcrypt hash using RPC function
          try {
            console.log("Generating password hash for new user");
            const passwordHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                password: newPassword
              })
            });
            
            if (passwordHashResponse.ok) {
              // Get hash from response
              const hashText = await passwordHashResponse.text();
              // Clean up the response text (remove quotes if present)
              passwordHash = hashText.replace(/^"|"$/g, '');
              console.log("Password hash generated successfully");
            } else {
              console.error("Failed to generate password hash, using default");
              passwordHash = "$2a$10$uVGiCUxSTwXhVcDIKiLDvu8YY8NsLdMAGIFCUZ7ZHB3kDO2VGvPPW";
            }
          } catch (error) {
            console.error("Error generating password hash:", error);
            passwordHash = "$2a$10$uVGiCUxSTwXhVcDIKiLDvu8YY8NsLdMAGIFCUZ7ZHB3kDO2VGvPPW";
          }
        } else {
          // Default password hash if none provided
          passwordHash = "$2a$10$uVGiCUxSTwXhVcDIKiLDvu8YY8NsLdMAGIFCUZ7ZHB3kDO2VGvPPW";
        }
        
        // Create a new user in the userfile table
        const newUserRecord = {
          "USERNAME": clientData.username, 
          "USER_ROLE": userRole,
          "STATUS": clientData.status || "ACTIVE",
          "EMAIL": clientData.email || "",
          "PASSWORD_HASH": passwordHash, // Generated or default password hash
          
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
          "CREDIT_BALANCE": clientData.credit_balance || 30,
          "DAILY_RATE": clientData.daily_rate || 0,
          "BACKGROUND_IMGURL": clientData.background_imgurl || "",
          "BANNER_IMGURL": clientData.banner_imgurl || "",
          
          // New fields
          "EXP_DATE": clientData.exp_date || null,
          "ID_NO": clientData.id_no || "",
          "SST": clientData.sst || 0,
          "SALES_TAX": clientData.sales_tax || 0,
          "TABLE": clientData.table || 0,
          "PIN_NO": clientData.pin_no || "",
          "COMPANY_REGNO": clientData.company_regno || "",
          
          // Audit fields
          "CREATED_AT": new Date().toISOString(),
          "UPDATED_AT": new Date().toISOString(),
          "CREATED_BY": "System",
          "UPDATED_BY": "System"
        };
        
        // Create the new user record
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/userfile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(newUserRecord)
        });
        
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(`Failed to create new user record: ${errorText}`);
          return new Response(JSON.stringify({
            success: false,
            message: `Error creating new user: ${createResponse.status} - ${errorText}`
          }), {
            status: createResponse.status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const newUserData = await createResponse.json();
        userId = newUserData[0].ID;
        userData = newUserData;
        console.log("New user created with ID:", userId);
        
        // Return success response for new user
        return new Response(JSON.stringify({
          success: true,
          message: "New client created successfully",
          data: {
            user: {
              id: newUserData[0].ID,
              username: newUserData[0].USERNAME,
              email: newUserData[0].EMAIL,
              role: newUserData[0].USER_ROLE,
              status: newUserData[0].STATUS
            },
            client: newUserData[0]
          }
        }), {
          status: 201, // 201 Created
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: "User not found"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    userId = userData[0].ID;
    console.log("Found user ID:", userId);
    
    // Check if a new password was provided
    let passwordHash = undefined;
    const newPassword = clientData.plaintext_password || clientData.new_password;
    
    if (newPassword) {
      try {
        console.log("Generating password hash for existing user");
        const passwordHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            password: newPassword
          })
        });
        
        if (passwordHashResponse.ok) {
          // Get hash from response
          const hashText = await passwordHashResponse.text();
          // Clean up the response text (remove quotes if present)
          passwordHash = hashText.replace(/^"|"$/g, '');
          console.log("Password hash generated successfully for password update");
        } else {
          console.error("Failed to generate password hash for existing user");
        }
      } catch (error) {
        console.error("Error generating password hash:", error);
      }
    }
    
    // Prepare update record for the unified userfile table
    const updateRecord = {
      // User fields
      "USER_ROLE": userRole,
      "STATUS": clientData.status || userData[0].STATUS || "ACTIVE",
      "EMAIL": clientData.email || userData[0].EMAIL || "",
      
      // Client fields
      "BUSINESSNAME": clientData.businessname || userData[0].BUSINESSNAME || "",
      "BUSINESSCHN": clientData.businesschn || userData[0].BUSINESSCHN || "",
      "CLIENT_TYPE": clientData.client_type || userData[0].CLIENT_TYPE || "OTHER",
      "CATOGERY": clientData.catogery || userData[0].CATOGERY || "",
      "HAWKERID": clientData.hawkerid || userData[0].HAWKERID || "",
      "ADDRESS": clientData.address || userData[0].ADDRESS || "",
      "CITY": clientData.city || userData[0].CITY || "",
      "STATE": clientData.state || userData[0].STATE || "",
      "COUNTRY": clientData.country || userData[0].COUNTRY || "",
      "CONTACT_PERSON": clientData.contact_person || userData[0].CONTACT_PERSON || "",
      "PHONE_NUMBER": clientData.phone_number || userData[0].PHONE_NUMBER || "",
      "CREDIT_BALANCE": clientData.credit_balance || userData[0].CREDIT_BALANCE || 0,
      "DAILY_RATE": clientData.daily_rate || userData[0].DAILY_RATE || 0,
      "BACKGROUND_IMGURL": clientData.background_imgurl || userData[0].BACKGROUND_IMGURL || "",
      "BANNER_IMGURL": clientData.banner_imgurl || userData[0].BANNER_IMGURL || "",
        // New fields added
      "EXP_DATE": (() => {
        // Date format handling for PostgreSQL (should be YYYY-MM-DD)
        const expDate = clientData.exp_date || userData[0].EXP_DATE || null;
        if (expDate) {
          console.log(`Received EXP_DATE for update: ${expDate}`);
          // Validate that it's in PostgreSQL acceptable format (YYYY-MM-DD)
          const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(expDate);
          if (!isValidFormat) {
            console.warn(`EXP_DATE not in YYYY-MM-DD format: ${expDate}. Keeping existing value: ${userData[0].EXP_DATE || null}`);
            return userData[0].EXP_DATE || null;
          }
        }
        return expDate;
      })(),
      "ID_NO": clientData.id_no || userData[0].ID_NO || "",
      "SST": clientData.sst || userData[0].SST || 0,
      "SALES_TAX": clientData.sales_tax || userData[0].SALES_TAX || 0,
      "TABLE": clientData.table || userData[0].TABLE || 0,
      "PIN_NO": clientData.pin_no || userData[0].PIN_NO || "",
      "COMPANY_REGNO": clientData.company_regno || userData[0].COMPANY_REGNO || "",
      
      // Audit fields
      "UPDATED_AT": new Date().toISOString(),
      "UPDATED_BY": clientData.username || "System"
    };
    
    // Only add the PASSWORD_HASH if a new password was provided and hash was generated
    if (passwordHash) {
      updateRecord.PASSWORD_HASH = passwordHash;
      console.log("Including password hash in update");
    }
    
    // Update the unified userfile record
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?ID=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updateRecord)
    });
      if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`Failed to update userfile record: ${errorText}`);
      
      // Detailed error logging for date format issues
      if (errorText.includes("22008") || errorText.includes("date/time field value out of range")) {
        console.error("PostgreSQL date error detected. Original exp_date value:", clientData.exp_date);
        console.error("Formatted exp_date value sent to database:", updateRecord.EXP_DATE);
        return new Response(JSON.stringify({
          success: false,
          message: `Error updating user: ${updateResponse.status} - ${errorText} - Please ensure date is in YYYY-MM-DD format`
        }), {
          status: updateResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: `Error updating user: ${updateResponse.status} - ${errorText}`
      }), {
        status: updateResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const updatedData = await updateResponse.json();
    
    // Return success response with formatted data for compatibility with the UI
    return new Response(JSON.stringify({
      success: true,
      message: passwordHash ? "Client updated successfully with new password" : "Client updated successfully",
      data: {
        // Format response with both user and client fields as separate objects for UI compatibility
        user: {
          id: updatedData[0].ID,
          username: updatedData[0].USERNAME,
          email: updatedData[0].EMAIL,
          role: updatedData[0].USER_ROLE,
          status: updatedData[0].STATUS
        },
        client: {
          CLIENT_ID: updatedData[0].CLIENT_ID,
          USERID: updatedData[0].ID,
          USERNAME: updatedData[0].USERNAME,
          USER_ROLE: updatedData[0].USER_ROLE,
          BUSINESSNAME: updatedData[0].BUSINESSNAME,
          BUSINESSCHN: updatedData[0].BUSINESSCHN,
          CLIENT_TYPE: updatedData[0].CLIENT_TYPE,
          CATOGERY: updatedData[0].CATOGERY,
          HAWKERID: updatedData[0].HAWKERID,
          STATUS: updatedData[0].STATUS,
          ADDRESS: updatedData[0].ADDRESS,
          CITY: updatedData[0].CITY,
          STATE: updatedData[0].STATE,
          COUNTRY: updatedData[0].COUNTRY,
          CONTACT_PERSON: updatedData[0].CONTACT_PERSON,
          EMAIL: updatedData[0].EMAIL,
          PHONE_NUMBER: updatedData[0].PHONE_NUMBER,
          CREDIT_BALANCE: updatedData[0].CREDIT_BALANCE,
          DAILY_RATE: updatedData[0].DAILY_RATE,
          BACKGROUND_IMGURL: updatedData[0].BACKGROUND_IMGURL,
          BANNER_IMGURL: updatedData[0].BANNER_IMGURL,
          // Include new fields in the response
          EXP_DATE: updatedData[0].EXP_DATE,
          ID_NO: updatedData[0].ID_NO,
          SST: updatedData[0].SST,
          SALES_TAX: updatedData[0].SALES_TAX,
          TABLE: updatedData[0].TABLE,
          PIN_NO: updatedData[0].PIN_NO,
          COMPANY_REGNO: updatedData[0].COMPANY_REGNO,
          UPDATED_AT: updatedData[0].UPDATED_AT,
          UPDATED_BY: updatedData[0].UPDATED_BY
        }
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Client update error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}