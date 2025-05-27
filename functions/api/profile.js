import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  console.log('Profile function called - DEBUG');
  try {
    const { request, env } = context;
    console.log('Request method:', request.method, 'URL:', request.url);
    
    // Set CORS headers for all responses
    const corsHeaders = getCorsHeaders();
    // Ensure JSON content type in all responses
    const standardHeaders = {
      "Content-Type": "application/json",
      ...corsHeaders
    };

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Accept both GET and POST for flexibility
    if (request.method !== "POST" && request.method !== "GET") {
      console.log('Method not allowed:', request.method);
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: standardHeaders
      });
    }

    // Safely retrieve Supabase configuration with enhanced error handling
    let supabaseConfig;
    try {
      supabaseConfig = getSupabaseConfig(env);
    } catch (configError) {
      console.error('Failed to get Supabase config:', configError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to initialize database connection",
        error: configError.message
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    const { supabaseUrl, supabaseKey, isUsingServiceRole } = supabaseConfig;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('CRITICAL: Missing Supabase configuration');
      return new Response(JSON.stringify({
        success: false,
        message: "Server configuration error: Missing Supabase credentials",
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey
        }
      }), {
        status: 500,
        headers: standardHeaders
      });
    }

    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Using service role key:', isUsingServiceRole);
    
    // Check if we have the service role key (needed to bypass RLS)
    if (!isUsingServiceRole) {
      console.warn('WARNING: No service role key found. RLS policies may block operations.');
    }
    
    let username;
    let createIfNotExists = false;
    
    // Extract username from request based on method
    if (request.method === "POST") {
      try {
        // Try to parse JSON body
        const body = await request.json();
        username = body.username;
        createIfNotExists = body.createIfNotExists === true; // Default to false if not specified
        
        console.log('Username from POST body:', username);
        console.log('Create if not exists:', createIfNotExists);
        
        // Additional debug info about request body
        console.log('Full request body:', JSON.stringify(body));
      } catch (error) {
        console.error('Error parsing JSON body:', error);
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid JSON body",
          error: error.message
        }), {
          status: 400,
          headers: standardHeaders
        });
      }
    } else {
      // For GET requests, try to get username from query string
      const url = new URL(request.url);
      username = url.searchParams.get('username');
      createIfNotExists = url.searchParams.get('createIfNotExists') === 'true';
      console.log('Username from URL params:', username);
      console.log('Create if not exists from URL params:', createIfNotExists);
    }

    // Validate username
    if (!username) {
      console.log('Username is required');
      return new Response(JSON.stringify({
        success: false,
        message: "Username is required"
      }), {
        status: 400,
        headers: standardHeaders
      });
    }

    console.log("Fetching profile for username:", username);

    // Construct the API URL
    const apiUrl = `${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}&select=*`;
    console.log("Supabase API request URL:", apiUrl);

    // ENHANCED ERROR HANDLING: Wrap the fetch call in a try-catch block
    let userResponse;
    try {
      // Create a custom timeout mechanism that works in all environments
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout
      
      try {
        // Get user details from the userfile table
        userResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "X-Client-Info": "cloudflare-pages-function" // Help with debugging
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (fetchError) {
      console.error('Fetch operation failed:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to connect to database",
        error: fetchError.message,
        type: fetchError.name
      }), {
        status: 500,
        headers: standardHeaders
      });
    }

    console.log("Supabase response status:", userResponse.status);

    if (!userResponse.ok) {
      let errorText = "Unknown error";
      try {
        // Try to get error as text
        errorText = await userResponse.text();
      } catch (e) {
        console.error("Failed to read error response:", e);
      }
      
      console.error('Supabase error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `Error fetching user: ${userResponse.status}`,
        details: errorText
      }), {
        status: userResponse.status,
        headers: standardHeaders
      });
    }

    let users;
    try {
      users = await userResponse.json();
    } catch (jsonError) {
      console.error("Failed to parse user response JSON:", jsonError);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid response from database",
        error: jsonError.message
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    console.log("Users returned from Supabase:", users ? users.length : 0);
    
    if (users && users.length > 0) {
      console.log("First user object keys:", Object.keys(users[0]));
      
      // We found the user, return the user profile data
      const user = users[0];
      return new Response(JSON.stringify({
        success: true,
        message: "Profile retrieved successfully",
        data: user
      }), {
        status: 200,
        headers: standardHeaders
      });
    }

    // User not found - either return 404 or create a new user record
    if (!createIfNotExists) {
      console.log('User not found and createIfNotExists is false');
      return new Response(JSON.stringify({
        success: false,
        message: "User not found",
        requested_username: username
      }), {
        status: 404,
        headers: standardHeaders
      });
    }
    
    // Create a new user record
    console.log('Creating new user record for:', username);
    
    // Generate password hash using RPC function (default password is the same as username)
    console.log(`Generating password hash for new user ${username}`);
    let passwordHash;
    try {
      // Call the generate_password_hash RPC function
      const passwordHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: username // Default password is the same as username
        })
      });
      
      if (!passwordHashResponse.ok) {
        const errorText = await passwordHashResponse.text();
        throw new Error(`Error generating password hash: ${passwordHashResponse.status} ${errorText}`);
      }
      
      // Parse the response properly to extract the hash value
      const passwordHashText = await passwordHashResponse.text();
      console.log("Raw password hash response:", passwordHashText);
      
      // Clean up the hash - remove any quotes or extra characters
      passwordHash = passwordHashText;
      if (passwordHashText.startsWith('"') && passwordHashText.endsWith('"')) {
        passwordHash = passwordHashText.slice(1, -1);
      }
      // Remove any "xxxx" prefix if it exists
      if (passwordHash.startsWith("xxxx")) {
        passwordHash = passwordHash.slice(4);
      }
      
      console.log("Cleaned password hash:", passwordHash);
    } catch (hashError) {
      console.error('Failed to generate password hash:', hashError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to generate secure password hash",
        error: hashError.message
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    // Generate username hash using the same RPC function
    let usernameHash;
    try {
      const usernameHashResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_password_hash`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: username
        })
      });
      
      if (!usernameHashResponse.ok) {
        const errorText = await usernameHashResponse.text();
        throw new Error(`Error generating username hash: ${usernameHashResponse.status} ${errorText}`);
      }
      
      // Parse the response properly to extract the hash value
      const usernameHashText = await usernameHashResponse.text();
      console.log("Raw username hash response:", usernameHashText);
      
      // Clean up the hash - remove any quotes or extra characters
      usernameHash = usernameHashText;
      if (usernameHashText.startsWith('"') && usernameHashText.endsWith('"')) {
        usernameHash = usernameHashText.slice(1, -1);
      }
      // Remove any "xxxx" prefix if it exists
      if (usernameHash.startsWith("xxxx")) {
        usernameHash = usernameHash.slice(4);
      }
      
      console.log("Cleaned username hash:", usernameHash);
    } catch (hashError) {
      console.error('Failed to generate username hash:', hashError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to generate secure username hash",
        error: hashError.message
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    // Using schema provided in the prompt
    // Based on user schema - minimum required fields only
    const newUser = {
      USERNAME: username,
      PASSWORD_HASH: passwordHash, // Using securely generated hash
      USERNAME_HASH: usernameHash, // Using securely generated hash
      USER_ROLE: 'USER', // Default role
      EMAIL: `${username}@example.com`, // Default placeholder email
      STATUS: 'ACTIVE',
      CREATED_AT: new Date().toISOString(),
      BUSINESSNAME: username, // Using username as default business name
      CONTACT_PERSON: username // Using username as default contact person
    };
    
    // ENHANCED ERROR HANDLING: Wrap creation in try-catch block with robust timeout handling
    let createResponse;
    try {
      // Create a custom timeout mechanism that works in all environments
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout
      
      try {
        // Insert the new user record
        createResponse = await fetch(`${supabaseUrl}/rest/v1/userfile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation', // Return the created object
            'X-Client-Info': 'cloudflare-pages-function' // Help with debugging
          },
          body: JSON.stringify(newUser),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (createError) {
      console.error('User creation operation failed:', createError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to create user in database",
        error: createError.message,
        type: createError.name
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    if (!createResponse.ok) {
      let errorText = "Unknown error";
      try {
        errorText = await createResponse.text();
      } catch (e) {
        console.error("Failed to read error response:", e);
      }
      
      console.error('Error creating user:', errorText);
      
      // Enhanced error response with RLS help
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to create user record: ${createResponse.status}`,
        details: errorText,
        rls_help: `This appears to be an RLS (Row Level Security) error. 
                   Make sure your Supabase SUPABASE_SERVICE_ROLE_KEY is properly set in your environment variables,
                   or disable RLS for the userfile table in the Supabase dashboard.`
      }), {
        status: createResponse.status,
        headers: standardHeaders
      });
    }
    
    // Get the newly created user record
    let createdUser;
    try {
      createdUser = await createResponse.json();
    } catch (jsonError) {
      console.error("Failed to parse create response JSON:", jsonError);
      return new Response(JSON.stringify({
        success: false,
        message: "User may have been created but the response was invalid",
        error: jsonError.message
      }), {
        status: 500,
        headers: standardHeaders
      });
    }
    
    console.log('New user record created:', createdUser);
    
    // Return the new user record
    return new Response(JSON.stringify({
      success: true,
      message: "New profile created successfully",
      data: createdUser[0],
      isNewUser: true
    }), {
      status: 201, // Created status code
      headers: standardHeaders
    });

  } catch (error) {
    console.error("Profile retrieval error:", error);
    
    // ENHANCED ERROR RESPONSE: More detailed error information
    let errorDetails = {
      message: error.message || "An unexpected error occurred",
      name: error.name,
      code: error.code
    };
    
    // Check for common Cloudflare Worker execution issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorDetails.possibleCause = "Network error when connecting to Supabase";
      errorDetails.resolution = "Check if Supabase URL is correct and accessible";
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: "Server error processing profile request",
      error: errorDetails
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...getCorsHeaders()
      }
    });
  }
}