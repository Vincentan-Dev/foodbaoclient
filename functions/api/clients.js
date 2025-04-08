import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept GET requests
    if (request.method !== "GET") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
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
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Get search term from query or body
    let searchTerm = "";
    if (request.method === "POST") {
      const requestData = await request.json();
      searchTerm = requestData.searchTerm || "";
    } else {
      const url = new URL(request.url);
      searchTerm = url.searchParams.get("search") || "";
    }
    
    console.log("Searching clients with term:", searchTerm);
    
    // Build the query using the unified userfile table
    let query = `${supabaseUrl}/rest/v1/userfile?select=ID,USERNAME,EMAIL,USER_ROLE,STATUS,CLIENT_ID,BUSINESSNAME,BUSINESSCHN,PHONE_NUMBER,ADDRESS`;
    
    // Add filter if search term is provided
    if (searchTerm) {
      // Expanded search to include business name for better user search experience
      query += `&or=(USERNAME.ilike.%${encodeURIComponent(searchTerm)}%,EMAIL.ilike.%${encodeURIComponent(searchTerm)}%,BUSINESSNAME.ilike.%${encodeURIComponent(searchTerm)}%,PHONE_NUMBER.ilike.%${encodeURIComponent(searchTerm)}%)`;
    }
    
    // Get client data from Supabase
    const response = await fetch(query, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "count=exact"
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase error: ${response.status}`, errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching clients: ${response.status} ${errorText}`
      }), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    const clients = await response.json();
    const countHeader = response.headers.get("content-range");
    const totalCount = countHeader ? parseInt(countHeader.split("/")[1]) : clients.length;
    
    // Map the results with properly cased fields for UI compatibility
    const mappedClients = clients.map(client => ({
      client_id: client.CLIENT_ID || null,
      id: client.ID,
      username: client.USERNAME || null,
      email: client.EMAIL,
      status: client.STATUS,
      user_role: client.USER_ROLE || null,
      businessName: client.BUSINESSNAME,
      businessNameChn: client.BUSINESSCHN,
      phone: client.PHONE_NUMBER,
      address: client.ADDRESS
    }));
    
    return new Response(JSON.stringify({
      success: true,
      items: mappedClients,
      count: totalCount,
      auth: {
        username: request.headers.get('X-Auth-Username') || null,
        user_role: request.headers.get('X-Auth-Role') || null
      }
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error("Client search error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while fetching clients",
      auth: {
        username: null,
        user_role: null
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