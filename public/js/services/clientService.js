window.clientService = {
  // Get all clients with optional search
  getClients: async function(searchTerm = '') {
    try {
      // Get authorization token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Build API URL
      let apiUrl = '../api/clients';
      if (searchTerm) {
        apiUrl += `?q=${encodeURIComponent(searchTerm)}`;
      }
      
      console.log('Making request to:', apiUrl);
      
      // Make the request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      // Log the raw response first
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Try to parse the response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      // Check if the response has the expected structure
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('API response missing items array:', data);
        // Create an empty items array if none exists
        data.items = [];
      }
      
      console.log('Got client data, count:', data.items.length);
      return data;
    } catch (error) {
      console.error('Error in clientService.getClients:', error);
      throw error;
    }
  },
  
  // Get a single client by ID
  getClientById: async function(clientId) {
    try {
      // Get authorization token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make the request - use NEW endpoint, not old Oracle one
      const response = await fetch(`../api/clients/${clientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error fetching client: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.getClientById:', error);
      throw error;
    }
  },
  
  // Delete a client
  deleteClient: async function(clientId) {
    try {
      // Get authorization token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make the request - use NEW endpoint, not old Oracle one
      const response = await fetch(`../api/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error deleting client: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.deleteClient:', error);
      throw error;
    }
  },

  // Get combined client info (from app_users and clients)
  getClientInfo: async function(clientId) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const apiUrl = `../api/client-info?id=${clientId}`;
      console.log('Making request to:', apiUrl);
      
      // Replace debugApiCall with standard fetch
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Debug response
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Error fetching client info: ${response.status}`);
      }
      
      // Parse the response
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.getClientInfo:', error);
      throw error;
    }
  },
  
  // Create a new client record
  createClientRecord: async function(clientData) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Convert to uppercase field names for database
      const dbData = {
        USERNAME: clientData.username,
        BUSINESSNAME: clientData.businessname,
        BUSINESSCHN: clientData.businesschn,
        CLIENT_TYPE: clientData.client_type,
        CATOGERY: clientData.catogery,
        HAWKERID: clientData.hawkerid,
        STATUS: clientData.status,
        CONTACT_PERSON: clientData.contact_person,
        EMAIL: clientData.email,
        PHONE_NUMBER: clientData.phone_number,
        ADDRESS: clientData.address,
        CITY: clientData.city,
        STATE: clientData.state,
        COUNTRY: clientData.country,
        CREDIT_BALANCE: clientData.credit_balance,
        DAILY_RATE: clientData.daily_rate,
        USERID: clientData.userid,
        CREATED_AT: new Date().toISOString(),
        UPDATED_AT: new Date().toISOString(),
        CREATED_BY: localStorage.getItem('username') || 'System',
        UPDATED_BY: localStorage.getItem('username') || 'System'
      };
      
      // Add debug logs
      console.log('Creating client record with data:', dbData);
      
      // Make the request
      const response = await fetch('../api/clients-crud', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Error creating client record: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.createClientRecord:', error);
      throw error;
    }
  },
  
  // Update an existing client record
  updateClientRecord: async function(clientId, clientData) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Convert to uppercase field names for database
      const dbData = {
        USERNAME: clientData.username,
        BUSINESSNAME: clientData.businessname,
        BUSINESSCHN: clientData.businesschn,
        CLIENT_TYPE: clientData.client_type,
        CATOGERY: clientData.catogery,
        HAWKERID: clientData.hawkerid,
        STATUS: clientData.status,
        CONTACT_PERSON: clientData.contact_person,
        EMAIL: clientData.email,
        PHONE_NUMBER: clientData.phone_number,
        ADDRESS: clientData.address,
        CITY: clientData.city,
        STATE: clientData.state,
        COUNTRY: clientData.country,
        CREDIT_BALANCE: clientData.credit_balance,
        DAILY_RATE: clientData.daily_rate,
        USERID: clientData.userid,
        UPDATED_AT: new Date().toISOString(),
        UPDATED_BY: localStorage.getItem('username') || 'System',
        BACKGROUND_IMGURL: clientData.background_imgurl || clientData.BACKGROUND_IMGURL,
        BANNER_IMGURL: clientData.banner_imgurl || clientData.BANNER_IMGURL
      };
      
      // IMPORTANT FIX: Use query parameters instead of path parameters
      const response = await fetch(`../api/clients-crud?CLIENT_ID=${clientId}`, {
        method: 'PATCH', // Use PATCH method consistently
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Error updating client record: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.updateClientRecord:', error);
      throw error;
    }
  },
  
  // Delete a client record
  deleteClientRecord: async function(clientId) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      console.log('Deleting client record:', clientId);
      
      const response = await fetch(`../api/delete-client?id=${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Error deleting client: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.deleteClientRecord:', error);
      throw error;
    }
  },
  
  // Validate if a username exists in the clients table
  validateUsername: async function(username) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`../api/validate-username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error validating username: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.validateUsername:', error);
      throw error;
    }
  },
  
  // Create new client in both tables
  createNewClient: async function(clientData) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      if (!clientData.username) {
        throw new Error('Username is required');
      }
      
      // Create data object for both tables
      const newClientData = {
        // App Users data
        user: {
          username: clientData.username,
          email: clientData.email || '',
          user_role: 'CLIENT',
          status: 'ACTIVE'
          // We don't include password_hash here - will be generated by bcrypt on the server
        },
        
        // Send plaintext password for the server to hash with bcrypt
        plaintext_password: clientData.username, // Default password is the username
        
        // Clients data
        client: {
          USERNAME: clientData.username,
          BUSINESSNAME: clientData.businessname,
          BUSINESSCHN: clientData.businesschn,
          CLIENT_TYPE: clientData.client_type,
          CATOGERY: clientData.catogery, 
          HAWKERID: clientData.hawkerid,
          STATUS: clientData.status || 'ACTIVE',
          CONTACT_PERSON: clientData.contact_person,
          EMAIL: clientData.email,
          PHONE_NUMBER: clientData.phone_number,
          ADDRESS: clientData.address,
          CITY: clientData.city,
          STATE: clientData.state,
          COUNTRY: clientData.country,
          CREDIT_BALANCE: clientData.credit_balance || 0,
          DAILY_RATE: clientData.daily_rate || 0,
          CREATED_AT: new Date().toISOString(),
          UPDATED_AT: new Date().toISOString(),
          CREATED_BY: localStorage.getItem('username') || 'System',
          UPDATED_BY: localStorage.getItem('username') || 'System'
        }
      };
      
      console.log('Sending data to create new client with bcrypt password hashing');
      
      // Make the request to create both records
      const response = await fetch('../api/create-new-client', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClientData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Error creating client: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in clientService.createNewClient:', error);
      throw error;
    }
  },

  // Update client by username
  updateClientByUsername: async function(username, profileData) {
    try {
      if (!username) {
        return {
          success: false,
          message: 'Username is required'
        };
      }
      
      console.log('Updating client with username:', username);
      console.log('Profile data:', profileData);
      
      // Get authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return {
          success: false,
          message: 'Authentication required'
        };
      }
      
      // Use same endpoint but with PUT method
      const response = await fetch(`../api/clients/by-username/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      console.log('Update API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        return {
          success: false,
          message: `Error: ${response.status} ${errorText}`
        };
      }
      
      const data = await response.json();
      console.log('Update response:', data);
      
      return {
        success: true,
        message: 'Profile updated successfully',
        data: data
      };
    } catch (error) {
      console.error('Error in updateClientByUsername:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Updated mapDatabaseResults function with fallbacks
  mapDatabaseResults: function(results) {
    if (!Array.isArray(results)) {
      console.error('Expected array but got:', results);
      return [];
    }
    
    return results.map(row => ({
      client_id: row.CLIENT_ID || row.client_id || row.id || row.ID,
      username: row.USERNAME || row.username || 'Unknown',
      email: row.EMAIL || row.email || '',
      status: row.STATUS || row.status || 'UNKNOWN',
      user_role: row.USER_ROLE || row.user_role || 'user'
    }));
  }
};

