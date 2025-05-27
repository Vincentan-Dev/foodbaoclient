import { getSupabaseConfig, getCorsHeaders, supabaseFetch } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const corsHeaders = getCorsHeaders();
    
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Get auth token from headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        }), 
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Get Supabase configuration
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Get the username from the query parameters or URL path
    const url = new URL(request.url);
    const usernameParam = url.searchParams.get('username');
    
    let username;
    
    // Try to verify the token and get user data
    try {
      // First, try to verify the token using Supabase auth
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ApiKey': supabaseKey
        }
      });
      
      if (verifyResponse.ok) {
        // Token is valid, use the user data
        const userData = await verifyResponse.json();
        username = userData.email || userData.user_metadata?.username;
        console.log(`User authenticated with valid token: ${username}`);
      } else {
        console.log('Token validation failed, trying to use username from query params');
        
        // If token verification failed, try to use the username from query params
        if (usernameParam) {
          username = usernameParam;
        } else {
          // Last resort - try to extract username from the token (not secure, but fallback)
          try {
            // Get the payload part of the JWT token
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            username = payload.email || payload.user_metadata?.username;
          } catch (e) {
            console.error('Failed to extract username from token:', e);
          }
        }
        
        if (!username) {
          return new Response(
            JSON.stringify({
              error: 'Invalid token',
              message: 'Authentication failed'
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      
      // If token verification fails, try to use the username from query params
      if (usernameParam) {
        username = usernameParam;
      } else {
        return new Response(
          JSON.stringify({
            error: 'Server error',
            message: 'Error verifying authentication token'
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }
    
    console.log(`Fetching tables for user: ${username}`);
    
    // Get the query parameters
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit') || 50;
    
    // Build the query to fetch tables from the database
    try {
      // First try to get user information to get CLIENT_ID
      console.log(`Attempting to fetch client data for username: ${username}`);
      
      let clientId = null;
      const clientResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}&select=CLIENT_ID,TABLE`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (clientResponse.ok) {
        const clientData = await clientResponse.json();
        if (clientData && clientData.length > 0) {
          clientId = clientData[0].CLIENT_ID;
          console.log(`Found client ID: ${clientId} for username: ${username}`);
          
          // If client has a TABLE number, use that to fetch tables
          const tableNumber = clientData[0].TABLE;
          if (tableNumber) {
            console.log(`Client has table number: ${tableNumber}, fetching table data`);
            
            // Fetch table data for this specific table number
            const tableResponse = await fetch(`${supabaseUrl}/rest/v1/tables?TABLE_NUMBER=eq.${tableNumber}`, {
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
              }
            });
            
            if (tableResponse.ok) {
              const tableData = await tableResponse.json();
              if (tableData && tableData.length > 0) {
                console.log(`Found table data for table number: ${tableNumber}`);
                return new Response(
                  JSON.stringify(tableData),
                  {
                    status: 200,
                    headers: {
                      'Content-Type': 'application/json',
                      ...corsHeaders
                    }
                  }
                );
              }
            }
          }
        }
      }
      
      // If we get here, either:
      // 1. Could not find client data, or
      // 2. Client has no associated table, or
      // 3. Table data could not be found
      // So we'll fetch all tables for the client ID or username
      
      let fetchUrl = `${supabaseUrl}/rest/v1/tables`;
      let queryParams = [];
      
      // Add filters if provided
      if (status && status !== 'all') {
        queryParams.push(`status=eq.${encodeURIComponent(status)}`);
      }
      
      if (clientId) {
        queryParams.push(`CLIENT_ID=eq.${encodeURIComponent(clientId)}`);
      } else {
        queryParams.push(`USERNAME=eq.${encodeURIComponent(username)}`);
      }
      
      // Set a limit
      queryParams.push(`limit=${limit}`);
      
      // Append query parameters
      if (queryParams.length > 0) {
        fetchUrl += `?${queryParams.join('&')}`;
      }
      
      console.log(`Fetching tables with URL: ${fetchUrl}`);
      
      // Fetch tables from Supabase
      const tablesResponse = await fetch(
        fetchUrl,
        {
          method: 'GET',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (!tablesResponse.ok) {
        console.error('Error fetching tables:', await tablesResponse.text());
        return new Response(
          JSON.stringify({
            error: 'Database error',
            message: `Error fetching tables: ${tablesResponse.status}`
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
      let tables = await tablesResponse.json();
      
      // If no tables were found, return an empty array
      if (!tables || tables.length === 0) {
        console.log(`No tables found for ${username}`);
        tables = [];
      }
      
      return new Response(
        JSON.stringify(tables),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      console.error('Error fetching tables:', error);
      
      return new Response(
        JSON.stringify({
          error: 'Server error',
          message: error.message || 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error('Global error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Server error',
        message: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}