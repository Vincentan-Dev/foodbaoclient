import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

    // Ensure we're handling POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        message: `Method ${request.method} not allowed. Use POST.`
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    try {
      // Get the request payload
      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid JSON in request body'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      console.log('Supabase proxy request:', payload);
      
      // Handle ping action (for testing)
      if (payload.action === 'ping') {
        return new Response(JSON.stringify({
          success: true,
          message: 'Proxy connection successful',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Handle test_connection action
      if (payload.action === 'test_connection') {
        // Check if we have the required environment variables
        if (!supabaseUrl || !supabaseKey) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Missing Supabase configuration in environment',
            vars: {
              url: !!supabaseUrl,
              key: !!supabaseKey
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // Connect to Supabase
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/${payload.table || 'app_users'}?${payload.query || 'select=count'}`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Supabase API error: ${response.status} - ${text}`);
          }
          
          const data = await response.json();
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Connection successful',
            data
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to connect to Supabase: ' + error.message
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      // Handle OAuth sign-in
      if (payload.action === 'oauth_signin') {
        const provider = payload.provider;
        
        if (!provider) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Provider is required for OAuth sign-in'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // Get redirect URL from Supabase
        // You'll need to implement this based on Supabase's OAuth flow
        const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent('https://foodbaoadmin.pages.dev/callback')}`;
        
        return new Response(JSON.stringify({
          success: true,
          url: redirectUrl
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Handle authentication
      if (payload.action === 'authenticate') {
        const { username, password } = payload;
        
        if (!username || !password) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Username and password are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        try {
          // Convert username to uppercase for consistency with the rest of your system
          const uppercaseUsername = username.toUpperCase();
          console.log('Authenticating user:', uppercaseUsername);
          
          // First try the verify_password RPC function approach
          try {
            // Query the user first to get their hashed password
            const userResponse = await fetch(
              `${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(uppercaseUsername)}&select=*`, 
              {
                method: 'GET',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (userResponse.ok) {
              const users = await userResponse.json();
              if (users && users.length > 0) {
                const userData = users[0];
                
                // Call the verify_password RPC function to check the password
                const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_password`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    stored_hash: userData.PASSWORD_HASH,
                    user_password: password
                  })
                });
                
                if (verifyResponse.ok) {
                  const isValid = await verifyResponse.json();
                  
                  if (isValid === true) {
                    // Password is valid, create token and return user data
                    const { PASSWORD_HASH, ...userWithoutPassword } = userData;
                    
                    // Create a simple token
                    const token = btoa(JSON.stringify({
                      userId: userData.ID,
                      username: userData.USERNAME,
                      role: userData.USER_ROLE || 'user',
                      exp: Math.floor(Date.now() / 1000) + 3600
                    }));
                    
                    // Update the last login time if needed
                    try {
                      await fetch(
                        `${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(uppercaseUsername)}`,
                        {
                          method: 'PATCH',
                          headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                          },
                          body: JSON.stringify({
                            LAST_LOGIN: new Date().toISOString()
                          })
                        }
                      );
                    } catch (updateError) {
                      console.error('Error updating last login:', updateError);
                      // Non-critical error, continue with authentication
                    }
                    
                    return new Response(JSON.stringify({
                      success: true,
                      user: userWithoutPassword,
                      token
                    }), {
                      headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                      }
                    });
                  } else {
                    return new Response(JSON.stringify({
                      success: false,
                      message: 'Invalid username or password'
                    }), {
                      status: 401,
                      headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                      }
                    });
                  }
                } else {
                  console.error('Error calling verify_password RPC:', await verifyResponse.text());
                  throw new Error('Failed to verify password');
                }
              }
            }
            
            // If we get here, the user was not found in the 'userfile' table
            console.log('User not found in userfile table, trying other tables');
          } catch (rpcError) {
            console.error('RPC password verification error, falling back:', rpcError);
            // Continue to fallback approach
          }
          
          // Fallback approach: Query other tables directly
          console.log('Querying other user tables for:', uppercaseUsername);
          
          // Use the correct table and field names from your system
          const tables = ['app_users', 'users', 'profiles'];
          let userData = null;
          let tableUsed = null;
          
          // Try each possible table name until we find the user
          for (const table of tables) {
            try {
              // Try both uppercase and lowercase field names
              const fieldNames = ['USERNAME', 'username'];
              
              for (const fieldName of fieldNames) {
                const response = await fetch(
                  `${supabaseUrl}/rest/v1/${table}?${fieldName}=eq.${encodeURIComponent(uppercaseUsername)}&select=*`, 
                  {
                    method: 'GET',
                    headers: {
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${supabaseKey}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                if (response.ok) {
                  const users = await response.json();
                  if (users && users.length > 0) {
                    userData = users[0];
                    tableUsed = table;
                    break;
                  }
                }
              }
              
              if (userData) break;
            } catch (e) {
              console.log(`Error checking ${table} table:`, e.message);
            }
          }
          
          console.log(`User lookup results: found in ${tableUsed || 'no table'}`);
          
          if (!userData) {
            return new Response(JSON.stringify({
              success: false,
              message: 'Invalid username or password'
            }), {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
          // For fallback tables, check if we have a password_hash field
          const passwordField = userData.PASSWORD_HASH || userData.password_hash || userData.password;
          
          // If we have a hashed password, try to verify it with the RPC
          if (passwordField && passwordField.startsWith('$')) {
            try {
              // It looks like a hashed password, use the verify_password RPC
              const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_password`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                  stored_hash: passwordField,
                  user_password: password
                })
              });
              
              if (verifyResponse.ok) {
                const isValid = await verifyResponse.json();
                if (!isValid) {
                  return new Response(JSON.stringify({
                    success: false,
                    message: 'Invalid username or password'
                  }), {
                    status: 401,
                    headers: {
                      'Content-Type': 'application/json',
                      ...corsHeaders
                    }
                  });
                }
              } else {
                // RPC call failed, fall back to direct comparison
                if (passwordField !== password) {
                  return new Response(JSON.stringify({
                    success: false,
                    message: 'Invalid username or password'
                  }), {
                    status: 401,
                    headers: {
                      'Content-Type': 'application/json',
                      ...corsHeaders
                    }
                  });
                }
              }
            } catch (verifyError) {
              console.error('Password verification error:', verifyError);
              // Fall back to direct comparison
              if (passwordField !== password) {
                return new Response(JSON.stringify({
                  success: false,
                  message: 'Invalid username or password'
                }), {
                  status: 401,
                  headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                  }
                });
              }
            }
          } else {
            // Plain text password, direct comparison
            if (passwordField !== password) {
              return new Response(JSON.stringify({
                success: false,
                message: 'Invalid username or password'
              }), {
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }
          }
          
          // If we got here, authentication succeeded
          // Remove sensitive fields from the returned user object
          const userWithoutPassword = { ...userData };
          delete userWithoutPassword.PASSWORD_HASH;
          delete userWithoutPassword.password_hash;
          delete userWithoutPassword.password;
          
          // Create a simple token
          const token = btoa(JSON.stringify({
            userId: userData.ID || userData.id,
            username: userData.USERNAME || userData.username,
            role: userData.USER_ROLE || userData.role || 'user',
            exp: Math.floor(Date.now() / 1000) + 3600
          }));
          
          return new Response(JSON.stringify({
            success: true,
            user: userWithoutPassword,
            token
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          console.error('Authentication error:', error);
          
          return new Response(JSON.stringify({
            success: false,
            message: 'Authentication error: ' + error.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      // Handle getting user info with access token
      if (payload.action === 'get_user') {
        const { access_token } = payload;
        
        if (!access_token) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Access token is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        try {
          // Get user info from Supabase using the access token
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Supabase API error: ${response.status} - ${text}`);
          }
          
          const userData = await response.json();
          
          // Get additional user data from app_users table if needed
          let appUserData = null;
          try {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/app_users?id=eq.${userData.id}&select=*`, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (userResponse.ok) {
              const users = await userResponse.json();
              if (users.length > 0) {
                appUserData = users[0];
              }
            }
          } catch (e) {
            // Ignore errors getting additional data
            console.error('Error getting app_user data:', e);
          }
          
          // Merge auth user data with app_users data if available
          const user = {
            ...userData,
            ...(appUserData || {})
          };
          
          return new Response(JSON.stringify({
            success: true,
            user
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to get user info: ' + error.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      // Default response for unknown actions
      return new Response(JSON.stringify({
        success: false,
        message: `Unknown action: ${payload.action}`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error('Supabase proxy error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Proxy error: ' + error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error('Supabase proxy error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Proxy error: ' + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}