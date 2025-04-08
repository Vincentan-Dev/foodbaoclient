export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  try {
    // Only allow GET
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Get search term from URL
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('term');
    
    if (!searchTerm) {
      return new Response(JSON.stringify({
        success: false,
        message: "Search term is required"
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Get database credentials
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Database configuration error"
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    console.log(`Searching for clients with term: ${searchTerm}`);
    
    // Build query with ILIKE for case-insensitive search
    // Use both lowercase and uppercase column names to handle both possibilities
    
    // Try multiple search endpoints to handle case sensitivity
    const endpoints = [
      // Variation 1: All uppercase columns 
      `${supabaseUrl}/rest/v1/APP_USERS?or=(USERNAME.ilike.%25${encodeURIComponent(searchTerm)}%25,BUSINESSNAME.ilike.%25${encodeURIComponent(searchTerm)}%25,EMAIL.ilike.%25${encodeURIComponent(searchTerm)}%25)`,
      
      // Variation 2: All lowercase columns
      `${supabaseUrl}/rest/v1/app_users?or=(username.ilike.%25${encodeURIComponent(searchTerm)}%25,businessname.ilike.%25${encodeURIComponent(searchTerm)}%25,email.ilike.%25${encodeURIComponent(searchTerm)}%25)`
    ];
    
    // Try each endpoint until one works
    let clientData = null;
    let successfulEndpoint = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          clientData = await response.json();
          successfulEndpoint = endpoint;
          break;
        }
      } catch (err) {
        console.error(`Error with endpoint ${endpoint}:`, err);
        // Continue to the next endpoint
      }
    }
    
    if (!clientData) {
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to search clients"
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    console.log(`Found ${clientData.length} clients using endpoint: ${successfulEndpoint}`);
    
    return new Response(JSON.stringify({
      success: true,
      clients: clientData,
      count: clientData.length,
      endpoint: successfulEndpoint
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
    
  } catch (error) {
    console.error('Client search error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}