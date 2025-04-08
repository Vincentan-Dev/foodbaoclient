export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Get Supabase credentials
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get username from request body
    const requestData = await request.json();
    const username = requestData.username;
    
    if (!username) {
      console.error("Username is required");
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log("Fetching client info for username:", username);
    
    // Get user details from unified userfile table - using uppercase USERNAME for consistency
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`Error fetching user data: ${userResponse.status}`, errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user data: ${userResponse.status} ${errorText}`
      }), {
        status: userResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const userData = await userResponse.json();
    
    if (!userData || userData.length === 0) {
      console.error("User not found for username:", username);
      return new Response(JSON.stringify({
        success: false,
        message: "User not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log("Found user data:", userData[0].ID);
    const user = userData[0];
    
    // Map user data with proper case handling for compatibility with existing UI
    const mappedUser = {
      id: user.ID,
      username: user.USERNAME,
      email: user.EMAIL,
      role: user.USER_ROLE,
      status: user.STATUS,
      created_at: user.CREATE_AT,
      last_login: user.LAST_LOGIN
    };
    
    // Map client data from the same record for compatibility with existing UI
    const clientData = {
      CLIENT_ID: user.CLIENT_ID,
      USERID: user.ID,
      USERNAME: user.USERNAME,
      USER_ROLE: user.USER_ROLE,
      BUSINESSNAME: user.BUSINESSNAME,
      BUSINESSCHN: user.BUSINESSCHN,
      CLIENT_TYPE: user.CLIENT_TYPE,
      CATOGERY: user.CATOGERY,
      HAWKERID: user.HAWKERID,
      STATUS: user.STATUS,
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
      CREATED_AT: user.CREATED_AT,
      UPDATED_AT: user.UPDATED_AT,
      CREATED_BY: user.CREATED_BY,
      UPDATED_BY: user.UPDATED_BY
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: mappedUser,
        client: clientData // Now this is always available since it's from the same record
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Client info error:", error);
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