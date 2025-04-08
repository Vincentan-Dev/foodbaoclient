/**
 * Authentication Service using Supabase via Cloudflare proxy
 */
console.log('Auth Service Loaded v6 - Proxy Only');

// Use only the proxy URL
const PROXY_URL = '/api/supabase-proxy';

// Connection status tracking
let connectionTested = false;
let connectionStatus = 'untested';

// Expose the connection test to the global scope for the button
window.authServiceTestConnection = async function() {
  try {
    // Use the proxy for all Supabase calls
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test_connection',
        table: 'app_users',
        query: 'count'
      })
    });
    
    const data = await response.json();
    connectionTested = true;
    connectionStatus = response.ok && data.success ? 'connected' : 'failed';
    return response.ok && data.success;
  } catch (error) {
    connectionTested = true;
    connectionStatus = 'failed';
    return false;
  }
};

/**
 * Authentication service for FoodBao Admin
 */
const authService = {
  async login(username, password) {
    try {
      console.log('Login attempt for:', username);
      
      // Authentication via proxy only
      try {
        console.log('Using proxy for authentication');
        
        const response = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'authenticate',
            username: username,
            password: password
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Authentication failed');
        }
        
        // Store authentication data
        const userData = data.user;
        const token = btoa(JSON.stringify({
          userId: userData.id,
          username: userData.username,
          role: userData.role || userData.user_role,
          exp: Math.floor(Date.now() / 1000) + 3600
        }));
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('username', userData.username);
        localStorage.setItem('user_id', userData.id);
        localStorage.setItem('user_role', userData.role || userData.user_role);
        if (userData.email) localStorage.setItem('user_email', userData.email);
        
        console.log('Authentication successful via proxy');
        return { success: true, user: userData, token };
      } catch (proxyError) {
        console.error('Proxy auth failed:', proxyError);
        throw new Error('Authentication failed: ' + proxyError.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Parse token
      const tokenData = JSON.parse(atob(token));
      
      // Check if token has expired
      if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Invalid token format', e);
      this.logout();
      return false;
    }
  },
  
  /**
   * Get current user information
   * @returns {Object|null} User object or null if not authenticated
   */
  getCurrentUser() {
    if (!this.isAuthenticated()) return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Invalid user data format', e);
      return null;
    }
  },
  
  /**
   * Logout user and clear local storage
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    
    // Redirect to login page
    window.location.href = '/login.html';
  },

  // Rest of your methods remain the same
  testConnection: window.authServiceTestConnection,

  // Add connection status API
  getConnectionStatus() {
    return { tested: connectionTested, status: connectionStatus };
  },

  authenticatedFetch: async function(url, options = {}) {
    try {
      // Get the token
      const token = await this.getToken();
      
      // Set up headers with authentication
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      // Make the fetch request
      let response = await fetch(url, {
        ...options,
        headers
      });
      
      // If unauthorized, try to refresh token and retry
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Get new token and retry
          const newToken = await this.getToken();
          headers['Authorization'] = `Bearer ${newToken}`;
          
          // Retry the request
          response = await fetch(url, {
            ...options,
            headers
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in authenticatedFetch:', error);
      throw error;
    }
  },
  
  getUserDetails: async function() {
    try {
        // Check if we already have user details cached
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('user_id');
        const userRole = localStorage.getItem('user_role');
        
        if (username && userId && userRole) {
            return {
                username,
                id: userId,
                role: userRole
            };
        }
        
        // If not, fetch from user details API
        const apiUrl = '/api/user';
        
        const response = await this.authenticatedFetch(apiUrl);
        const userData = await response.json();
        
        // Store user details in localStorage
        if (userData.username) localStorage.setItem('username', userData.username);
        if (userData.id) localStorage.setItem('user_id', userData.id);
        if (userData.role) localStorage.setItem('user_role', userData.role);
        if (userData.email) localStorage.setItem('user_email', userData.email);
        
        console.log('User details retrieved');
        return userData;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
  },

  async signInWithProvider(provider) {
    try {
      // Call your proxy endpoint
      const response = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'oauth_signin',
          provider: provider // 'google', 'github', etc.
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to the OAuth provider
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Failed to initiate OAuth flow');
      }
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      throw error;
    }
  },

  // Get the current authentication token
  getToken: async function() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  },
  
  // Refresh the token if needed
  refreshToken: async function() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.error('No refresh token available');
        return false;
      }
      
      // Call the refresh token endpoint
      const response = await fetch('../api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.token) {
        localStorage.setItem('auth_token', result.token);
        return true;
      } else {
        throw new Error(result.message || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
};

// Override the original logout function to check for login_in_progress
const originalLogout = authService.logout;
authService.logout = function() {
    // Don't redirect if we're in the middle of a login attempt
    if (localStorage.getItem('login_in_progress')) {
        console.log('Login in progress, preventing redirect');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_email');
        return;
    }
    
    // Otherwise use the original logout function
    originalLogout.call(this);
};

// Add connection status to the login page
window.checkSupabaseConnection = async function() {
  const result = await authService.testConnection();
  alert(result 
    ? '✅ Connected to Supabase successfully!' 
    : '❌ Failed to connect to Supabase. Development login only.');
};

// Run connection test at startup - using only the Edge Function
window.authServiceTestConnection().then(connected => {
  if (connected) {
    console.log('Supabase connection ready via proxy');
  } else {
    console.warn('Supabase connection failed - will use development login only');
  }
});

// REMOVE THE EXPORT AND THE SCRIPT TAG - JUST USE WINDOW.AUTHSERVICE INSTEAD
window.authService = {
  init: function() {
    console.log('Auth service initialized');
  },
  
  isAuthenticated: function() {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('username');
    return !!token && !!username;
  },
  
  getUsername: function() {
    return localStorage.getItem('username');
  },
  
  getUserRole: function() {
    return localStorage.getItem('user_role');
  },
  
  logout: function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
    localStorage.removeItem('client_id');
    window.location.href = 'login.html';
  }
};


