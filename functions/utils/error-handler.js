/**
 * Standardized error handling for API responses
 * Used for consistent error formatting across the application
 */

// Format error responses with helpful details
export function formatErrorResponse(error, statusCode = 500) {
  console.error("API error:", error);
  
  return new Response(JSON.stringify({
    success: false,
    message: error.message || "An unexpected error occurred",
    toast: {
      type: 'error',
      message: error.message || "Operation failed",
      position: 'center'
    },
    // Include error details for better debugging
    error: {
      type: error.name,
      details: error.stack ? error.stack.split('\n')[0] : null,
      timestamp: new Date().toISOString()
    }
  }), {
    status: statusCode,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// Safe JSON parsing helper
export function safeJsonParse(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Invalid input' };
  }
  
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'Empty response' };
    }
    
    // Handle potential content-type issues where text might start with characters before valid JSON
    let jsonStart = trimmed.indexOf('{');
    let jsonEnd = trimmed.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      // Try array format
      jsonStart = trimmed.indexOf('[');
      jsonEnd = trimmed.lastIndexOf(']');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        return { success: false, error: 'Invalid JSON format' };
      }
    }
    
    // Extract what might be valid JSON
    const jsonPart = trimmed.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonPart);
    
    return { success: true, data };
  } catch (error) {
    console.error('JSON parse error:', error);
    return { success: false, error: error.message };
  }
}

// Safe fetch wrapper with robust error handling
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Handle HTTP error status codes
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error ${response.status}`;
      
      try {
        // Try to parse error JSON for more details
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Use error text if not valid JSON
        if (errorText) {
          errorMessage += `: ${errorText.substring(0, 100)}`;
        }
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }
    
    // Get raw text
    const text = await response.text();
    
    // Try to parse as JSON
    const result = safeJsonParse(text);
    
    if (!result.success) {
      // If we can't parse JSON, return the raw text
      return { text, headers: Object.fromEntries(response.headers.entries()) };
    }
    
    // Return successfully parsed JSON
    return result.data;
  } catch (error) {
    // Add URL info to the error
    error.url = url;
    throw error;
  }
}