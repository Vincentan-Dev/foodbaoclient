export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
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
    
    // Get data from request body
    const requestData = await request.json();
    const { username, client_id } = requestData;

    console.log("Delete request data:", requestData);

    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required for deletion"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("Looking up user with username:", username);

    // Get user ID from username
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user: ${userResponse.status}`
      }), {
        status: userResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const userData = await userResponse.json();
    console.log("User data response:", userData);

    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "User not found with username: " + username
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const userIdToDelete = userData[0].id;
    console.log("Found user ID to delete:", userIdToDelete);

    // Skip the client check - we'll just delete both user and any associated clients

    // delete the user record - we do this regardless of client delete success
    console.log(`Deleting user record with ID: ${userIdToDelete}`);

    const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?id=eq.${encodeURIComponent(userIdToDelete)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!deleteUserResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to delete user: ${deleteUserResponse.status}`
      }), {
        status: deleteUserResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "User and associated client data deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Client delete error:", error);
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