import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept GET/POST/PUT/DELETE requests
    if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
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

    // Parse URL to get the variation ID if present
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const variationId = pathParts[pathParts.length - 1] !== 'item-variations' ? pathParts[pathParts.length - 1] : null;

    // Log request details for debugging
    console.log(`Processing ${request.method} request for item-variations${variationId ? ' ID: ' + variationId : ''}`);

    // Handle different request methods
    if (request.method === "GET") {
      // Fetch variations from Supabase - using the correct table name 'items_variations'
      let endpoint = `${supabaseUrl}/rest/v1/items_variations`;
      
      if (variationId && !isNaN(variationId)) {
        endpoint += `?VARIATION_ID=eq.${variationId}`;
      }
      
      console.log(`Fetching variations from: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Supabase API error (${response.status}): ${errorText}`);
          throw new Error(`Supabase error: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        const variations = await response.json();
        console.log(`Successfully fetched ${variations.length} variations`);
        
        return new Response(JSON.stringify({
          success: true,
          data: variationId && variations.length > 0 ? variations[0] : variations
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (fetchError) {
        console.error("Error fetching variations:", fetchError);
        throw fetchError; // Re-throw to be caught by outer try-catch
      }
    } 
    else if (request.method === "POST") {
      const requestData = await request.json();
      
      // Handle delete action through POST method
      if (requestData.action === 'delete' && requestData.variation_id) {
        console.log(`Attempting to delete variation ID: ${requestData.variation_id}`);
        
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/items_variations?VARIATION_ID=eq.${requestData.variation_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error(`Delete error: ${deleteResponse.status} - ${errorText}`);
          throw new Error(`Failed to delete variation: ${deleteResponse.status}`);
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: "Variation deleted successfully"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Regular POST to create a new variation
      console.log(`Creating new variation: ${requestData.NAME}`);
      
      const variationData = {
        NAME: requestData.NAME,
        STATUS: requestData.STATUS || "ACTIVE",
        CREATED_BY: requestData.UPDATED_BY || "admin",
        UPDATED_BY: requestData.UPDATED_BY || "admin",
        CREATED_AT: new Date().toISOString(),
        UPDATED_AT: new Date().toISOString()
      };

      try {
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/items_variations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(variationData)
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(`Create error: ${createResponse.status} - ${errorText}`);
          throw new Error(`Failed to create variation: ${createResponse.status}`);
        }

        const newVariation = await createResponse.json();
        return new Response(JSON.stringify({
          success: true,
          message: "Variation created successfully",
          data: newVariation[0]
        }), {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (createError) {
        console.error("Error creating variation:", createError);
        throw createError;
      }
    }
    else if (request.method === "PUT" && variationId) {
      try {
        const requestData = await request.json();
        
        const updateData = {
          NAME: requestData.NAME,
          STATUS: requestData.STATUS,
          UPDATED_BY: requestData.UPDATED_BY || "admin",
          UPDATED_AT: new Date().toISOString()
        };
        
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/items_variations?VARIATION_ID=eq.${variationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Update error: ${updateResponse.status} - ${errorText}`);
          throw new Error(`Failed to update variation: ${updateResponse.status}`);
        }

        const updatedVariation = await updateResponse.json();
        return new Response(JSON.stringify({
          success: true,
          message: "Variation updated successfully",
          data: updatedVariation[0]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (updateError) {
        console.error("Error updating variation:", updateError);
        throw updateError;
      }
    }
    else {
      return new Response(JSON.stringify({
        success: false,
        message: "Not implemented or invalid request"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error("API error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred",
      toast: {
        type: 'error',
        message: error.message || "Operation failed",
        position: 'center'
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