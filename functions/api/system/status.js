export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    console.log('System status check initiated');
    
    // Get database credentials
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    // Get Cloudinary credentials
    const cloudinaryName = env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryKey = env.CLOUDINARY_API_KEY;
    
    // Status to return
    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      cloudflare: {
        status: 'online'
      },
      database: {
        configured: !!(supabaseUrl && supabaseKey),
        url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : null,
        status: 'unknown'
      },
      cloudinary: {
        configured: !!(cloudinaryName && cloudinaryKey),
        cloud_name: cloudinaryName || null,
        status: 'unknown'
      }
    };
    
    // Check database connectivity if configured
    if (status.database.configured) {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );
        
        status.database.status = response.ok ? 'online' : 'error';
        status.database.statusCode = response.status;
        
        if (response.ok) {
          // Try to get a list of tables
          const tables = await response.json();
          status.database.tables = Object.keys(tables);
          
          // Check APP_USERS table specifically
          try {
            const usersResponse = await fetch(
              `${supabaseUrl}/rest/v1/APP_USERS?limit=1`, {
                method: 'GET',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                }
              }
            );
            
            status.database.appUsers = {
              status: usersResponse.ok ? 'accessible' : 'error',
              statusCode: usersResponse.status
            };
            
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              status.database.appUsers.recordCount = users.length;
            }
          } catch (tableError) {
            status.database.appUsers = {
              status: 'error',
              error: tableError.message
            };
          }
        }
      } catch (dbError) {
        status.database.status = 'error';
        status.database.error = dbError.message;
      }
    }
    
    // Check Cloudinary if configured
    if (status.cloudinary.configured) {
      try {
        // Just a basic ping to cloudinary.com
        const response = await fetch('https://api.cloudinary.com/v1_1', {
          method: 'GET'
        });
        
        status.cloudinary.status = 'reachable';
      } catch (cloudinaryError) {
        status.cloudinary.status = 'error';
        status.cloudinary.error = cloudinaryError.message;
      }
    }
    
    return new Response(JSON.stringify(status, null, 2), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
    
  } catch (error) {
    console.error('System status check error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}