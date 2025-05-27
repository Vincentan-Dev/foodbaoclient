export async function onRequest(context) {
  try {
    const { env } = context;
    
    return new Response(JSON.stringify({
      success: true,
      message: "Worker is working",
      environment: {
        hasSupabaseUrl: !!env?.SUPABASE_URL,
        hasSupabaseKey: !!env?.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!env?.SUPABASE_ANON_KEY
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
