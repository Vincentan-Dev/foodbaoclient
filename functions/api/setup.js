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
    
    // First verify the token to get user ID
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ApiKey': supabaseKey
      }
    });
    
    if (!verifyResponse.ok) {
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
    
    const userData = await verifyResponse.json();
    const userId = userData.id;
    
    // Different behavior based on HTTP method
    if (request.method === "GET") {
      // GET - retrieve settings
      try {
        const fetchUrl = `${supabaseUrl}/rest/v1/business_settings?user_id=eq.${encodeURIComponent(userId)}`;
        
        const settingsResponse = await supabaseFetch(
          fetchUrl,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          },
          env
        );
        
        if (!settingsResponse.ok) {
          if (settingsResponse.status === 404) {
            // Return default settings
            const defaultSettings = getDefaultSettings();
            return new Response(
              JSON.stringify(defaultSettings),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              }
            );
          } else {
            console.error('Error fetching settings:', await settingsResponse.text());
            return new Response(
              JSON.stringify({
                error: 'Database error',
                message: `Error fetching settings: ${settingsResponse.status}`
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
        
        let settings = await settingsResponse.json();
        
        // If no settings were found, provide defaults
        if (!settings || settings.length === 0) {
          settings = getDefaultSettings();
        } else {
          settings = settings[0]; // Return just the first settings object
        }
        
        return new Response(
          JSON.stringify(settings),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      } catch (error) {
        console.error('Error fetching settings:', error);
        
        // On any error, fall back to default settings
        const defaultSettings = getDefaultSettings();
        return new Response(
          JSON.stringify(defaultSettings),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    } else if (request.method === "POST" || request.method === "PUT") {
      // POST/PUT - update settings
      try {
        // Parse the request body
        const requestBody = await request.json();
        
        // Validate required fields
        if (!requestBody) {
          return new Response(
            JSON.stringify({
              error: 'Bad Request',
              message: 'Request body is required'
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
        
        // Set the user_id
        requestBody.user_id = userId;
        
        // Update timestamp
        requestBody.last_updated = new Date().toISOString();
        
        // Upsert the settings
        const fetchUrl = `${supabaseUrl}/rest/v1/business_settings`;
        
        const settingsResponse = await supabaseFetch(
          fetchUrl,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(requestBody)
          },
          env
        );
        
        if (!settingsResponse.ok) {
          console.error('Error updating settings:', await settingsResponse.text());
          return new Response(
            JSON.stringify({
              error: 'Database error',
              message: `Error updating settings: ${settingsResponse.status}`
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
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Settings updated successfully',
            data: requestBody
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
        console.error('Error updating settings:', error);
        return new Response(
          JSON.stringify({
            error: 'Server error',
            message: error.message || 'An error occurred updating settings'
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
    } else {
      // METHOD NOT ALLOWED
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: `The ${request.method} method is not supported for this endpoint`
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            'Allow': 'GET, POST, PUT, OPTIONS'
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

// Helper function to get default settings
function getDefaultSettings() {
  return {
    user_id: null, // Will be filled in by the client
    business_name: 'FoodBao Restaurant',
    business_address: '123 Food Street, Kuala Lumpur',
    business_phone: '+60 12-345-6789',
    business_email: 'info@foodbao.com',
    tax_rate: 6.0, // 6% SST in Malaysia
    currency: 'MYR',
    language: 'en',
    theme: 'light',
    table_count: 20,
    print_receipts: true,
    show_qr_codes: true,
    enable_online_ordering: true,
    enable_table_reservations: true,
    enable_customer_feedback: true,
    working_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    last_updated: new Date().toISOString()
  };
}