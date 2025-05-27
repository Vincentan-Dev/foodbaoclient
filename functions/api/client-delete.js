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
      console.error("Missing Supabase configuration");
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
    const { username } = requestData;

    console.log("Delete request for username:", username);

    if (!username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required for deletion"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // First try case-insensitive search - this is more likely to find the user
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=ilike.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!userResponse.ok) {
      console.error(`Error fetching user (status ${userResponse.status}):`, await userResponse.text());
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user: ${userResponse.status}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const userData = await userResponse.json();
    console.log("User search results count:", userData.length);

    if (!userData || userData.length === 0) {
      // Try exact match as a fallback
      console.log("No user found with case-insensitive search, trying exact match");
      const exactMatchResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (exactMatchResponse.ok) {
        const exactMatchData = await exactMatchResponse.json();
        if (exactMatchData && exactMatchData.length > 0) {
          // Found with exact match
          console.log("Found user with exact match");
          userData.push(...exactMatchData);
        }
      }
    }
    
    // If still not found, return error
    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "User not found with username: " + username
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Use uppercase "ID" to match the column name in the database
    const userIdToDelete = userData[0].ID;
    console.log("Found user ID to delete:", userIdToDelete);

    // First delete from clients table if the client record exists
    if (userData[0].CLIENT_ID) {
      console.log(`Deleting client record with ID: ${userData[0].CLIENT_ID}`);
      
      const deleteClientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${userData[0].CLIENT_ID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!deleteClientResponse.ok) {
        console.warn(`Warning: Failed to delete client record: ${await deleteClientResponse.text()}`);
        // Continue with user deletion even if client deletion fails
      } else {
        console.log("Client record deleted successfully");
      }
    }

    // Now delete the user record - we do this regardless of client delete success
    console.log(`Deleting user record with ID: ${userIdToDelete}`);

    const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?ID=eq.${encodeURIComponent(userIdToDelete)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!deleteUserResponse.ok) {
      const errorText = await deleteUserResponse.text();
      console.error(`Failed to delete user (status ${deleteUserResponse.status}):`, errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to delete user: ${errorText}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Try to delete any associated cloudinary accounts
    try {
      const cloudinaryResponse = await fetch(`${supabaseUrl}/rest/v1/cloudinaryacc?username=eq.${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (cloudinaryResponse.ok) {
        console.log("Associated cloudinary accounts deleted successfully");
      }
    } catch (cloudinaryError) {
      console.warn("Error deleting cloudinary accounts:", cloudinaryError);
      // Continue with success response even if cloudinary deletion fails
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
        ...corsHeaders
      }
    });
  }
}