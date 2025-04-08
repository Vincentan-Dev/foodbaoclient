export async function onRequest(context) {
  const { env } = context;
  
  // Return only public credentials that are safe to expose
  return new Response(JSON.stringify({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'
  }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}