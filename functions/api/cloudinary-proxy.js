/**
 * Cloudinary Image Proxy
 * 
 * This endpoint acts as a proxy for Cloudinary images to bypass CORS restrictions
 * It fetches images from Cloudinary and adds proper CORS headers before returning them
 */

export async function onRequest(context) {
  try {
    const { request } = context;
    
    // Get the Cloudinary URL from the query parameters
    const url = new URL(request.url).searchParams.get('url');
    
    if (!url) {
      return new Response('Missing URL parameter', { status: 400 });
    }
    
    // Validate that this is actually a Cloudinary URL
    if (!url.includes('cloudinary.com') && !url.includes('res.cloudinary.com')) {
      return new Response('Invalid Cloudinary URL', { status: 400 });
    }
    
    // Fetch the image from Cloudinary
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'FoodBaoClient/1.0'
      }
    });
    
    if (!response.ok) {
      return new Response(`Failed to load image: ${response.status} ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    // Read the response as an array buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Create a new response with the image and appropriate CORS headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-Proxied-By': 'FoodBao Cloudinary Proxy'
      }
    });
  } catch (error) {
    console.error('Cloudinary proxy error:', error);
    return new Response(`Error proxying Cloudinary image: ${error.message}`, { status: 500 });
  }
}