/**
 * Thermal Printer Utility Module
 * Handle printing orders to thermal printers with ESC/POS commands
 */

const ThermalPrinter = {
  /**
   * Print an order receipt
   * @param {Object} orderData - The order data object
   * @returns {Promise<Object>} - Response with success/error status
   */
  printOrder: async function(orderData) {
    try {
      // Get authentication token
      const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      // Get username from localStorage or sessionStorage
      const username = localStorage.getItem('username') || sessionStorage.getItem('username');
      if (!username) {
        throw new Error('Username not found in storage');
      }
      
      // Send print request to API
      const response = await fetch('/api/print-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          username: username,
          orderNumber: orderData.orderNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to print order');
      }
      
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Order sent to printer',
        timestamp: data.printTimestamp,
        orderNumber: data.orderNumber
      };
    } catch (error) {
      console.error('Error printing order:', error);
      return {
        success: false,
        message: error.message || 'An error occurred while printing the order'
      };
    }
  },
  
  /**
   * Check print status of an order
   * @param {string} orderId - ID of the order to check
   * @returns {Promise<Object>} - Response with print status
   */
  checkPrintStatus: async function(orderId) {
    try {
      // Get authentication token
      const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      // Get the order details
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check print status');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        throw new Error('Order not found');
      }
      
      const order = data.data[0];
      
      return {
        success: true,
        isPrinted: order.is_printed || false,
        orderId: orderId,
        orderNumber: order.order_number
      };
    } catch (error) {
      console.error('Error checking print status:', error);
      return {
        success: false,
        message: error.message || 'An error occurred while checking print status',
        isPrinted: false
      };
    }
  },
  
  /**
   * Manually print receipt if automatic printing failed
   * @param {string} orderId - ID of the order to reprint
   * @returns {Promise<Object>} - Response with success/error status
   */
  reprintOrder: async function(orderId) {
    try {
      // Get authentication token
      const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      // Get username from localStorage or sessionStorage
      const username = localStorage.getItem('username') || sessionStorage.getItem('username');
      if (!username) {
        throw new Error('Username not found in storage');
      }
      
      // Get the order number first
      const orderResponse = await fetch(`/api/orders?id=${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to fetch order details for reprinting');
      }
      
      const orderData = await orderResponse.json();
      
      if (!orderData.success || !orderData.data || orderData.data.length === 0) {
        throw new Error('Order not found for reprinting');
      }
      
      const orderNumber = orderData.data[0].order_number;
      
      // Now send the print request
      return await this.printOrder({
        orderId: orderId,
        orderNumber: orderNumber
      });
      
    } catch (error) {
      console.error('Error reprinting order:', error);
      return {
        success: false,
        message: error.message || 'An error occurred while reprinting the order'
      };
    }
  }
};

// Export the ThermalPrinter object
export default ThermalPrinter;