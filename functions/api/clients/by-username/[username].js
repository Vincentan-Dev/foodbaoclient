import { getSupabaseConfig, getCorsHeaders } from '../../_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const username = params.username;
    
    // Use the helper function to get CORS headers
    const corsHeaders = getCorsHeaders();
    
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
    
    // Use helper function to get Supabase credentials
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
    
    // Try different case variations for username search
    const usernameVariations = [
      username,                   // As entered
      username.toUpperCase(),     // All uppercase
      username.toLowerCase()      // All lowercase
    ];
    
    let clientData = null;
    
    // Try each username variation
    for (const usernameVariation of usernameVariations) {
      console.log(`Trying username variation: ${usernameVariation}`);
      
      // Try with exact matching
      const response = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(usernameVariation)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          clientData = data;
          console.log(`Found user with username: ${usernameVariation}`);
          break;
        }
      }
    }
    
    // If no exact match, try case-insensitive search
    if (!clientData) {
      console.log("No exact match found, trying case-insensitive search");
      const response = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=ilike.${encodeURIComponent(username)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          clientData = data;
          console.log(`Found user with case-insensitive search: ${data[0].USERNAME}`);
        }
      }
    }
    
    if (!clientData || clientData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Client not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Map fields using uppercase column names from the database
    // Include complete client info with proper field mapping
    const clientInfo = clientData[0];
    const mappedClient = {
      id: clientInfo.ID,
      username: clientInfo.USERNAME,
      email: clientInfo.EMAIL,
      role: clientInfo.USER_ROLE,
      status: clientInfo.STATUS,
      businessName: clientInfo.BUSINESSNAME,
      businessNameChn: clientInfo.BUSINESSCHN,
      clientType: clientInfo.CLIENT_TYPE,
      category: clientInfo.CATOGERY,
      hawkerId: clientInfo.HAWKERID,
      address: clientInfo.ADDRESS,
      city: clientInfo.CITY,
      state: clientInfo.STATE,
      country: clientInfo.COUNTRY,
      contactPerson: clientInfo.CONTACT_PERSON,
      phoneNumber: clientInfo.PHONE_NUMBER,
      creditBalance: clientInfo.CREDIT_BALANCE,
      dailyRate: clientInfo.DAILY_RATE,
      backgroundImgUrl: clientInfo.BACKGROUND_IMGURL,
      bannerImgUrl: clientInfo.BANNER_IMGURL,
      // Add the new fields
      expDate: clientInfo.EXP_DATE,
      idNo: clientInfo.ID_NO,
      sst: clientInfo.SST,
      salesTax: clientInfo.SALES_TAX,
      table: clientInfo.TABLE,
      pinNo: clientInfo.PIN_NO,
      companyRegNo: clientInfo.COMPANY_REGNO,
      created_at: clientInfo.CREATED_AT,
      updated_at: clientInfo.UPDATED_AT,
      last_login: clientInfo.LAST_LOGIN
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
      message: error.message || "An error occurred",
      toast: {
        type: 'error',
        message: 'Could not retrieve client information'
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