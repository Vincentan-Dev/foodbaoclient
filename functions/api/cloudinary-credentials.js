export async function onRequest(context) {
  const { env } = context;
  
  // Return credentials that are necessary for client-side uploads
  // Note: api_secret should never be exposed to the client side
  return new Response(JSON.stringify({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
    api_key: env.CLOUDINARY_API_KEY // Add API key which is needed for signed uploads
  }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}