// filepath: functions/api/tables/generate.js
import { getSupabaseConfig, getCorsHeaders } from '../_supabaseClient.js';

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
    
    // Check if method is POST
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
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
    
    // Get request body
    const requestBody = await request.json();
    const { count, username } = requestBody;
    
    // Validate input
    if (!username) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Username is required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    if (!count || isNaN(parseInt(count)) || parseInt(count) < 1 || parseInt(count) > 100) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Count must be a number between 1 and 100'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    const tableCount = parseInt(count);
    
    // Get Supabase configuration
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Try to verify token, but allow fallback to username from body
    let validToken = false;
    
    try {
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ApiKey': supabaseKey
        }
      });
      
      if (verifyResponse.ok) {
        // Token is valid
        const userData = await verifyResponse.json();
        console.log(`User authenticated with valid token: ${userData.email || userData.user_metadata?.username}`);
        validToken = true;
      } else {
        // Token verification failed, but we have the username from the request body
        // This is a more permissive approach that allows table generation even with expired tokens
        console.log('Token validation failed, using username from request body:', username);
        
        // Try to decode the token to get some basic info (not for security, just logging)
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log('Token payload:', payload.email || payload.sub);
        } catch (e) {
          console.warn('Could not decode token:', e);
        }
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      // Continue with the username from request body
    }
    
    // Get user information to get CLIENT_ID
    console.log(`Attempting to fetch client data for username: ${username}`);
    
    let clientId = null;
    try {
      const clientResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}&select=CLIENT_ID`, {
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
        } else {
          // If we can't find the user in userfile table, try the clients table
          console.log(`No client record found in userfile, checking clients table for username: ${username}`);
          
          const clientsResponse = await fetch(`${supabaseUrl}/rest/v1/clients?username=eq.${encodeURIComponent(username)}&select=id`, {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            }
          });
          
          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            if (clientsData && clientsData.length > 0) {
              clientId = clientsData[0].id;
              console.log(`Found client ID: ${clientId} from clients table for username: ${username}`);
            } else {
              return new Response(
                JSON.stringify({
                  error: 'Client not found',
                  message: `No client record found for username: ${username}`
                }),
                {
                  status: 404,
                  headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                  }
                }
              );
            }
          } else {
            return new Response(
              JSON.stringify({
                error: 'Client not found',
                message: `No client record found for username: ${username}`
              }),
              {
                status: 404,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              }
            );
          }
        }
      } else {
        console.error('Error fetching client data:', await clientResponse.text());
        return new Response(
          JSON.stringify({
            error: 'Database error',
            message: `Error fetching client data: ${clientResponse.status}`
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
      console.error('Error fetching client ID:', error);
      return new Response(
        JSON.stringify({
          error: 'Server error',
          message: error.message || 'An unexpected error occurred while fetching client data'
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
    
    // Check if there are already tables for this user, we don't want to recreate existing tables
    try {
      const existingTablesResponse = await fetch(
        `${supabaseUrl}/rest/v1/tables?USERNAME=eq.${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (existingTablesResponse.ok) {
        const existingTables = await existingTablesResponse.json();
        
        if (existingTables && existingTables.length > 0) {
          console.log(`Found ${existingTables.length} existing tables for username: ${username}`);
          
          // If there are already enough tables, just return success
          if (existingTables.length >= tableCount) {
            return new Response(
              JSON.stringify({
                success: true,
                message: `${existingTables.length} tables already exist for user ${username}`,
                data: existingTables
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              }
            );
          }
          
          // If there are some tables but not enough, just create the additional ones
          const additionalTablesNeeded = tableCount - existingTables.length;
          const startingTableNumber = existingTables.length + 1;
          
          console.log(`Creating ${additionalTablesNeeded} additional tables starting at number ${startingTableNumber}`);
          
          const newTables = await createTables(supabaseUrl, supabaseKey, clientId, username, additionalTablesNeeded, startingTableNumber);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `Created ${newTables.length} additional tables for user ${username}`,
              data: [...existingTables, ...newTables]
            }),
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
    } catch (error) {
      console.error('Error checking existing tables:', error);
      // We'll continue to create tables even if the check fails
    }
    
    // Create the tables in the database
    try {
      console.log(`Creating ${tableCount} tables for username: ${username} with clientId: ${clientId}`);
      
      const tables = await createTables(supabaseUrl, supabaseKey, clientId, username, tableCount);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Created ${tables.length} tables for user ${username}`,
          data: tables
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      console.error('Error creating tables:', error);
      
      return new Response(
        JSON.stringify({
          error: 'Server error',
          message: error.message || 'An unexpected error occurred while creating tables'
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

// Helper function to create tables
async function createTables(supabaseUrl, supabaseKey, clientId, username, count, startingNumber = 1) {
  const tables = [];
  const timestamp = new Date().toISOString();
  
  // First, let's try to detect the actual column names by retrieving the schema
  let columnMap = {
    // Default column mappings (assuming camelCase or lowercase)
    CLIENT_ID: 'client_id',
    USERNAME: 'username',
    TABLE_NUMBER: 'table_number',
    STATUS: 'status',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  };
  
  try {
    // Try to get schema information from a sample record
    const schemaResponse = await fetch(`${supabaseUrl}/rest/v1/tables?limit=1`, {
      method: 'GET',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (schemaResponse.ok) {
      const sampleData = await schemaResponse.json();
      if (sampleData && sampleData.length > 0) {
        console.log("Retrieved sample table schema:", Object.keys(sampleData[0]));
        
        // Update column map based on actual table schema
        const actualColumns = Object.keys(sampleData[0]);
        
        // Map expected columns to actual column names (case insensitive)
        for (const [expected, defaultName] of Object.entries(columnMap)) {
          const match = actualColumns.find(col => col.toLowerCase() === expected.toLowerCase());
          if (match) {
            columnMap[expected] = match;
            console.log(`Mapped ${expected} to actual column ${match}`);
          }
        }
      }
    }
  } catch (error) {
    console.warn("Error detecting table schema, using default column names:", error);
  }
  
  // Log the final column mapping being used
  console.log("Using column mapping:", columnMap);
  
  for (let i = 0; i < count; i++) {
    const tableNumber = (startingNumber + i).toString();
    
    // Prepare the table data using the detected column names
    const tableData = {};
    
    // Only add client_id if it was found in the schema
    if (clientId) {
      tableData[columnMap.CLIENT_ID] = clientId;
    }
    
    tableData[columnMap.USERNAME] = username;
    tableData[columnMap.TABLE_NUMBER] = tableNumber;
    tableData[columnMap.STATUS] = 'AVAILABLE'; // Default status
    tableData[columnMap.CREATED_AT] = timestamp;
    tableData[columnMap.UPDATED_AT] = timestamp;
    
    console.log(`Creating table ${tableNumber} with data:`, tableData);
    
    // Insert the table into the database
    const response = await fetch(`${supabaseUrl}/rest/v1/tables`, {
      method: 'POST',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(tableData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create table ${tableNumber}:`, errorText);
      
      // If this is the first table and we get an error, it might be a schema issue
      if (i === 0) {
        // Try with completely lowercase keys as a fallback
        const lowercaseData = {};
        Object.keys(tableData).forEach(key => {
          lowercaseData[key.toLowerCase()] = tableData[key];
        });
        
        console.log("Retrying with lowercase keys:", lowercaseData);
        
        const retryResponse = await fetch(`${supabaseUrl}/rest/v1/tables`, {
          method: 'POST',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(lowercaseData)
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to create table ${tableNumber}: ${errorText}`);
        }
        
        const newTable = await retryResponse.json();
        tables.push(newTable[0]);
        
        // Update the column map to use lowercase for remaining tables
        Object.keys(columnMap).forEach(key => {
          columnMap[key] = columnMap[key].toLowerCase();
        });
        
        continue;
      }
      
      throw new Error(`Failed to create table ${tableNumber}: ${errorText}`);
    }
    
    const newTable = await response.json();
    tables.push(newTable[0]);
  }
  
  return tables;
}