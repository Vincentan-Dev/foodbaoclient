// Add this to a new file: js/utils/apiConfig.js
const apiConfig = {
  // Detect environment
  isLocal: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  },
  
  // Get the base API URL
  getApiBaseUrl: () => {
    if (apiConfig.isLocal()) {
      // Local development - adjust port to match your Live Server
      return `http://localhost:${window.location.port || 5500}`;
    } else {
      // Production - use relative URL
      return '';
    }
  },
  
  // Get full API endpoint URL
  getApiUrl: (endpoint) => {
    return `${apiConfig.getApiBaseUrl()}${endpoint}`;
  }
};

// Example usage:
// const response = await fetch(apiConfig.getApiUrl('/api/supabase-proxy'), {...});