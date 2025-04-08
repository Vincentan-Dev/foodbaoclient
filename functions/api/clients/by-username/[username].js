export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const username = params.username;
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username parameter is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Fetching client by username: ${username}`);
    
    // Get Supabase credentials
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
    
    // Get client data - note the uppercase column names
    const response = await fetch(`${supabaseUrl}/rest/v1/app_users?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching client: ${response.status} ${errorText}`
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const clientData = await response.json();
    
    if (!clientData || clientData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Client not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Map to lowercase field names for frontend compatibility
    const mappedClient = {
      id: clientData[0].id,
      username: clientData[0].USERNAME,
      email: clientData[0].EMAIL,
      role: clientData[0].USER_ROLE,
      status: clientData[0].STATUS,
      created_at: clientData[0].CREATE_AT,
      last_login: clientData[0].LAST_LOGIN
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: mappedClient
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Error fetching client by username:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}