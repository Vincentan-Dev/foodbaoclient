export async function onRequest(context) {
  // Return only safe, non-sensitive configuration data
  // IMPORTANT: We no longer expose the Supabase key to the client
  const config = {
    apiVersion: "1.0",
    supabaseUrl: context.env.SUPABASE_URL,
    region: "ap-southeast-1",
    environment: context.env.ENVIRONMENT || "production",
    features: {
      notifications: true,
      offlineMode: true
    }
  };
  
  // Return JSON response with CORS headers
  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600" // Cache for 1 hour
    }
  });
}