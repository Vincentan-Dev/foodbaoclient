/**
 * API Handler - A utility for making API requests
 * Provides consistent error handling and authentication
 */

class ApiHandler {
  constructor() {
    this.baseUrl = '';
    this.token = localStorage.getItem('auth_token') || '';
  }

  /**
   * Set the authentication token
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Get the authentication token
   * @returns {string} The current token
   */
  getToken() {
    return this.token || localStorage.getItem('auth_token') || '';
  }

  /**
   * Clear the authentication token (for logout)
   */
  clearToken() {
    this.token = '';
    localStorage.removeItem('auth_token');
  }

  /**
   * Create default headers for API requests
   * @param {boolean} includeContentType - Whether to include Content-Type header
   * @returns {Object} Headers object
   */
  getHeaders(includeContentType = true) {
    const headers = {};
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch API response
   * @returns {Promise} Resolved with data or rejected with error
   */
  async handleResponse(response) {
    // Check if the response is ok (status in the range 200-299)
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        }
        if (errorData && errorData.error) {
          throw new Error(errorData.error);
        }
      } catch (e) {
        // If parsing fails, use status text
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      
      // If we reach here, throw generic error
      throw new Error(`Request failed with status: ${response.status}`);
    }
    
    // Check if response is empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text();
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise} - Resolved with response data
   */
  async get(endpoint, params = {}) {
    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`;
    
    if (Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(false)
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`GET request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise} - Resolved with response data
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`POST request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise} - Resolved with response data
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`PUT request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data (optional)
   * @returns {Promise} - Resolved with response data
   */
  async delete(endpoint, data = null) {
    const options = {
      method: 'DELETE',
      headers: this.getHeaders()
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      return this.handleResponse(response);
    } catch (error) {
      console.error(`DELETE request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Upload a file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise} - Resolved with response data
   */
  async uploadFile(endpoint, formData) {
    try {
      const headers = this.getHeaders(false); // Don't include Content-Type, let browser set it
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`File upload to ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Create a global instance
const apiHandler = new ApiHandler();

// Export for ES modules
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiHandler;
  }
} catch (e) {
  console.warn('Module export not supported in this environment');
}