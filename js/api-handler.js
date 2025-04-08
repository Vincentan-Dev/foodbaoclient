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
      const data = await response.json();
      
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
      console.error(`API request failed: ${error.message}`);
      toast.error('API request failed. Please try again.');
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
