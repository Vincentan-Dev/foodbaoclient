/**
 * Security middleware to add appropriate headers for preventing caching of sensitive pages
 * and improving security of the application
 */

/**
 * Add security headers to the response to prevent caching of sensitive pages
 * and improve overall security
 * 
 * @param {Response} response - The response object to modify
 * @returns {Response} The modified response with added security headers
 */
export function addSecurityHeaders(response) {
  // Create a new response with the same body but with additional headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      // Prevent caching of sensitive pages
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' blob: data: https://res.cloudinary.com; connect-src 'self' https://api.cloudinary.com;"
    }
  });
}

/**
 * Middleware handler for adding security headers to responses
 * 
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Context object
 * @param {Function} next - Function to call the next middleware
 * @returns {Response} The response with added security headers
 */
export default async function securityHeadersMiddleware(request, env, ctx) {
  // Get the path from the request URL
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Continue to the next middleware to get the response
  const response = await ctx.next();
  
  // Add security headers if this is an HTML page or sensitive API endpoint
  if (path.endsWith('.html') || path.includes('/api/') || !path.includes('.')) {
    return addSecurityHeaders(response);
  }
  
  // For non-HTML resources, just return the original response
  return response;
}