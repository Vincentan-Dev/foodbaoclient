export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const clientData = await request.json();
    console.log("Received client data:", clientData);
    
    if (!clientData.username || !clientData.email) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username and email are required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log("Creating new client with username:", clientData.username);
    
    // 1. Check if username already exists
    const checkUserResponse = await fetch(`${supabaseUrl}/rest/v1/app_users?USERNAME=eq.${encodeURIComponent(clientData.username)}&select=id`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    const existingUsers = await checkUserResponse.json();
    
    if (existingUsers && existingUsers.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username already exists"
      }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // 2. Get a new UUID
    const uuidResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_new_uuid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    const userId = await uuidResponse.json();
    console.log("Got new UUID:", userId);
    
    // 3. Create user with hashed password
    const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_user_with_hashed_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        p_id: userId,
        p_username: clientData.username,
        p_email: clientData.email,
        p_password: clientData.password || clientData.username,  // Use provided password or default to username
        p_user_role: clientData.user_role || "user"
      })
    });
    
    if (!createUserResponse.ok) {
      const errorBody = await createUserResponse.text();
      console.error("Error creating user:", errorBody);
      return new Response(JSON.stringify({
        success: false,
        message: `Error creating user: ${errorBody}`,
        toast: {
          type: 'error',
          message: 'Failed to create user account'
        }
      }), {
        status: createUserResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Check result
    const userResult = await createUserResponse.json();
    console.log("User creation result:", userResult);
    
    // 4. Create client record directly
    const clientRecord = {
      "USERID": userId,
      "BUSINESSNAME": clientData.businessname || clientData.username,
      "BUSINESSCHN": clientData.businesschn || "",
      "CLIENT_TYPE": clientData.client_type || "OTHER",
      "CATOGERY": clientData.catogery || "",
      "HAWKERID": clientData.hawkerid || "",
      "STATUS": clientData.status || "ACTIVE",
      "ADDRESS": clientData.address || "",
      "CITY": clientData.city || "",
      "STATE": clientData.state || "",
      "COUNTRY": clientData.country || "",
      "CONTACT_PERSON": clientData.contact_person || "",
      "EMAIL": clientData.email || "",
      "PHONE_NUMBER": clientData.phone_number || "",
      "CREDIT_BALANCE": parseFloat(clientData.credit_balance || 0),
      "DAILY_RATE": parseFloat(clientData.daily_rate || 0),
      "BACKGROUND_IMGURL": clientData.background_imgurl || "",
      "BANNER_IMGURL": clientData.banner_imgurl || "",
      "CREATED_AT": new Date().toISOString(),
      "CREATED_BY": clientData.username,
      "UPDATED_AT": new Date().toISOString(),
      "UPDATED_BY": clientData.username
    };
    
    const createClientResponse = await fetch(`${supabaseUrl}/rest/v1/userfile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(clientRecord)
    });
    
    if (!createClientResponse.ok) {
      const errorText = await createClientResponse.text();
      console.error("Error creating client:", errorText);
      
      // If client creation fails, delete the user we just created
      await fetch(`${supabaseUrl}/rest/v1/userfile?id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: `Error creating client: ${createClientResponse.status} - ${errorText}`
      }), {
        status: createClientResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const clientDataResponse = await createClientResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Client created successfully",
      data: clientDataResponse[0],
      toast: {
        type: 'success',
        message: `Client "${clientData.businessname || clientData.username}" created successfully!`
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Client creation error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred",
      toast: {
        type: 'error',
        message: 'Failed to create client: ' + (error.message || "Unexpected error")
      }
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}