import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get Supabase credentials with better error handling
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    console.log("PROFILE-UPDATE: Supabase URL:", supabaseUrl);
    console.log("PROFILE-UPDATE: Supabase Key available:", supabaseKey ? "Yes (length: " + supabaseKey.length + ")" : "No");

    if (!supabaseKey) {
      console.error("CRITICAL ERROR: Missing Supabase API key. Update cannot proceed.");
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase API key. Please check server configuration."
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get profile data from request body
    let profileData;
    try {
      profileData = await request.json();
      
      console.log("PROFILE-UPDATE: Received data:", JSON.stringify({
        username: profileData.USERNAME,
        businessname: profileData.BUSINESSNAME,
        // Log a few important fields without logging everything
        fields_received: Object.keys(profileData)
      }));
    } catch (parseError) {
      console.error("PROFILE-UPDATE: Error parsing request JSON:", parseError);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid JSON data in request body"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    if (!profileData.USERNAME) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("PROFILE-UPDATE: Updating profile for:", profileData.USERNAME);
    
    // Use the new RPC function to update the user profile
    const rpcEndpoint = `${supabaseUrl}/rest/v1/rpc/update_userfile`;
    console.log("PROFILE-UPDATE: Using RPC endpoint:", rpcEndpoint);
    
    // Create RPC parameter object - use the fields from the profile data or null for missing fields
    // Explicitly casting numeric fields to proper types
    const rpcParams = {
      p_username: profileData.USERNAME,
      // Don't update password hash unless provided - use null to keep existing value
      p_password_hash: null, 
      p_user_role: profileData.USER_ROLE || null,
      p_email: profileData.EMAIL || null,
      p_status: profileData.STATUS || null,
      p_contact_person: profileData.CONTACT_PERSON || null,
      p_phone_number: profileData.PHONE_NUMBER || null,
      p_address: profileData.ADDRESS || null,
      // Convert numeric values properly
      p_credit_balance: profileData.CREDIT_BALANCE !== undefined && profileData.CREDIT_BALANCE !== '' 
        ? Number(profileData.CREDIT_BALANCE) 
        : null,
      p_daily_rate: profileData.DAILY_RATE !== undefined && profileData.DAILY_RATE !== '' 
        ? Number(profileData.DAILY_RATE) 
        : null,
      p_client_type: profileData.CLIENT_TYPE || null,
      p_city: profileData.CITY || null,
      p_state: profileData.STATE || null,
      p_country: profileData.COUNTRY || null,
      p_imglogo: profileData.IMGLOGO || null,
      p_imgcompany: profileData.IMGCOMPANY || null,
      p_banner: profileData.BANNER || null,
      p_businessname: profileData.BUSINESSNAME || null,
      p_businesschn: profileData.BUSINESSCHN || null,
      p_background_imgurl: profileData.BACKGROUND_IMGURL || null,
      p_banner_imgurl: profileData.BANNER_IMGURL || null,
      // Category correctly mapped
      p_catogery: profileData.CATOGERY || null,
      // Hawker ID correctly mapped  
      p_hawkerid: profileData.HAWKERID || null
    };

    console.log("PROFILE-UPDATE: Sending RPC parameters to Supabase");
    
    // Call the RPC function
    const updateResponse = await fetch(rpcEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(rpcParams)
    });

    console.log("PROFILE-UPDATE: Supabase RPC response status:", updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('PROFILE-UPDATE: Supabase RPC error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error updating profile: ${updateResponse.status}`,
        details: errorText
      }), {
        status: updateResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // After successful RPC call, fetch the updated record to return in the response
    const getUserResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(profileData.USERNAME)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    let updatedData = [];
    if (getUserResponse.ok) {
      updatedData = await getUserResponse.json();
      console.log("PROFILE-UPDATE: Successfully retrieved updated user data");
    } else {
      console.warn("PROFILE-UPDATE: Could not retrieve updated user data, but update was successful");
    }

    // Return success response with the updated data
    return new Response(JSON.stringify({
      success: true,
      message: "Profile updated successfully using RPC function",
      data: updatedData[0] || {} // Return the updated record if available
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("PROFILE-UPDATE: Error:", error);
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