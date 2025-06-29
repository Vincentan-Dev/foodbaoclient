import toast from '../utils/toast.js';

class ApiHandler {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    
    // Add auth headers from localStorage
    const authToken = localStorage.getItem('auth_token');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('user_role');
    
    // Prepare headers with authentication data
    const headers = {
      ...options.headers || {},
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (username) {
      headers['X-Auth-Username'] = username;
    }
    
    if (userRole) {
      headers['X-Auth-Role'] = userRole;
    }
    
    // Apply the updated headers
    const updatedOptions = {
      ...options,
      headers
    };
    
    try {
      const response = await fetch(url, updatedOptions);
      
      // Check for non-successful HTTP status
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          // If it's JSON, parse it
          try {
            errorData = await response.json();
          } catch (jsonError) {
            // If JSON parsing fails, get text instead
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText || 'Unknown error'}`);
          }
        } else {
          // Not JSON, get as text
          const errorText = await response.text();
          throw new Error(`Server error (${response.status}): ${errorText || 'Unknown error'}`);
        }
        
        // If we got JSON error data, throw with details
        if (errorData) {
          const errorMessage = errorData.message || errorData.error || 'Unknown error';
          const error = new Error(`API Error: ${errorMessage}`);
          error.status = response.status;
          error.data = errorData;
          throw error;
        }
      }
      
      // Check if the content is JSON before attempting to parse
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Response from ${url} is not JSON. Content-Type: ${contentType}`);
        // Return text content for non-JSON responses
        return {
          success: false,
          message: 'Response is not JSON',
          textContent: await response.text(),
          status: response.status
        };
      }
      
      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        toast.error('Invalid response format from server');
        throw new Error(`JSON parse error: ${jsonError.message}`);
      }
      
      // Handle toast notifications if present in response
      if (data && data.toast) {
        const { type, message, position = 'center', duration = 3000 } = data.toast;
        if (toast[type]) {
          toast[type](message, { position, duration });
        } else {
          toast.info(message, { position, duration });
        }
      }
      
      // Update auth data if provided in the response
      if (data && data.auth) {
        if (data.auth.username !== undefined) {
          localStorage.setItem('username', data.auth.username || '');
        }
        
        if (data.auth.user_role !== undefined) {
          localStorage.setItem('user_role', data.auth.user_role || '');
        }
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed:`, error);
      // Only show toast for network errors, not for handled API errors
      if (!error.status) {
        toast.error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
}

// Create singleton instance
const apiHandler = new ApiHandler();
export default apiHandler;
