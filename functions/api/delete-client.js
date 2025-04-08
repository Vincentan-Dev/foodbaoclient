import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Only allow DELETE
    if (request.method !== "DELETE") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Get client ID from URL
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');
    
    if (!clientId) {
      return new Response(JSON.stringify({
        success: false,
        message: "Client ID is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log("Deleting client with ID:", clientId);
    
    // First, get the client record to find the user ID
    const getClientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'GET',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!getClientResponse.ok) {
      throw new Error(`Failed to find client: ${getClientResponse.status}`);
    }
    
    const clientData = await getClientResponse.json();
    if (!clientData || clientData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Client not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const userId = clientData[0].USERID;
    
    // Delete the client record first
    const deleteClientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'DELETE',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!deleteClientResponse.ok) {
      throw new Error(`Failed to delete client: ${deleteClientResponse.status}`);
    }
    
    // Also delete the corresponding user if it exists
    if (userId) {
      const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/app_users?id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      if (!deleteUserResponse.ok) {
        console.warn(`Warning: Failed to delete user: ${deleteUserResponse.status}`);
      }
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Client deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}