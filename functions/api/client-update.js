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
    
    // Find user record in the unified userfile table using uppercase USERNAME
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(uppercaseUsername)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`Failed to fetch userfile record: ${errorText}`);
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user: ${userResponse.status} - ${errorText}`
      }), {
        status: userResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const userData = await userResponse.json();
    
    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "User not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const userId = userData[0].ID;
    console.log("Found user ID:", userId);
    
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
      
      // Audit fields
      "UPDATED_AT": new Date().toISOString(),
      "UPDATED_BY": clientData.username || "System"
    };
    
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
      message: "Client updated successfully",
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