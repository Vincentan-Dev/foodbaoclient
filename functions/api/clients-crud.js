import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Ensure we have required credentials
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Parse URL to get the client ID if present
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');
    
    // Handle request based on HTTP method
    try {
      if (request.method === "GET") {
        // Handle GET - fetch client(s)
        if (clientId) {
          return await fetchClientById(clientId, supabaseUrl, supabaseKey);
        } else {
          return await fetchClients(request, supabaseUrl, supabaseKey);
        }
      } else if (request.method === "POST") {
        // Handle POST - create new client
        return await createClientRecord(request, supabaseUrl, supabaseKey);
      } else if (request.method === "PATCH" || request.method === "PUT") {
        // Handle PATCH/PUT - update client
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            message: "Client ID required for update"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const clientData = await request.json();
        
        // Update client using the correct CLIENT_ID column name
        const response = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
          method: 'PATCH',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(clientData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Database error: ${response.status} ${errorText}`);
        }
        
        const updatedClient = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          message: "Client record updated successfully",
          client: updatedClient[0]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else if (request.method === "DELETE") {
        // Handle DELETE - delete client
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            message: "Client ID required for deletion"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        return await deleteClientRecord(clientId, supabaseUrl, supabaseKey);
      } else {
        // Method not allowed
        return new Response(JSON.stringify({
          success: false,
          message: `Method ${request.method} not allowed`
        }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (error) {
      console.error('Error in clients-crud handler:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "Server error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error in clients-crud handler:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "Server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to update client record properly
async function updateClientRecord(clientId, request, supabaseUrl, supabaseKey) {
  try {
    const clientData = await request.json();
    
    // Map clientData to database fields
    const dbFields = {
      username: clientData.username,
      businessname: clientData.businessname,
      businesschn: clientData.businesschn,
      client_type: clientData.client_type,
      catogery: clientData.catogery,
      hawkerid: clientData.hawkerid,
      status: clientData.status,
      contact_person: clientData.contact_person,
      email: clientData.email,
      phone_number: clientData.phone_number,
      address: clientData.address,
      city: clientData.city,
      state: clientData.state,
      country: clientData.country,
      credit_balance: clientData.credit_balance,
      daily_rate: clientData.daily_rate,
      updated_at: new Date().toISOString(),
      updated_by: clientData.updated_by || 'System'
    };
    
    // Update the client record in Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'PATCH',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(dbFields)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }
    
    const updatedClient = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Client record updated successfully",
      client: updatedClient[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error updating client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to fetch a client by ID
async function fetchClientById(clientId, supabaseUrl, supabaseKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }

    const client = await response.json();

    return new Response(JSON.stringify({
      success: true,
      client: client[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Error fetching client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Function to delete a client from both clients and app_users tables
async function deleteClientRecord(clientId, supabaseUrl, supabaseKey) {
  try {
    // First, get the client record to get the username
    const getResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Database error getting client: ${getResponse.status} ${errorText}`);
    }

    const clientData = await getResponse.json();
    if (!clientData || clientData.length === 0) {
      throw new Error("Client record not found");
    }

    const username = clientData[0].USERNAME;

    // Step 1: Delete from clients table
    const deleteClientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?CLIENT_ID=eq.${clientId}`, {
      method: 'DELETE',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!deleteClientResponse.ok) {
      const errorText = await deleteClientResponse.text();
      throw new Error(`Error deleting client record: ${deleteClientResponse.status} ${errorText}`);
    }

    // Step 2: Delete from app_users table matching the username
    const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/app_users?username=eq.${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!deleteUserResponse.ok) {
      // Log error but don't fail the whole operation
      console.error(`Warning: Could not delete app_user record: ${await deleteUserResponse.text()}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Client record and associated user deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Error deleting client and user records:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Add this function to create a client record
async function createClientRecord(request, supabaseUrl, supabaseKey) {
  try {
    const clientData = await request.json();
    
    // Insert the client record in Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/clients`, {
      method: 'POST',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }
    
    const newClient = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Client record created successfully",
      client: newClient[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error creating client record:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}