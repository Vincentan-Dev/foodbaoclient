export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
};

// Set CORS to all /api responses
export const onRequest = async (context) => {
  // Handle preflight OPTIONS request
  if (context.request.method === "OPTIONS") {
    return await onRequestOptions();
  }
  
  // Process the request through the next handler
  const response = await context.next();
  
  // Add CORS headers to the response
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
  response.headers.set("Access-Control-Max-Age", "86400");
  
  return response;
};