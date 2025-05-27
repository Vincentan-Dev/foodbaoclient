// This is the improved loadTableOrders function to replace the current one
// Function to load orders for a table with improved UI
async function loadTableOrders(table) {
    try {
        const ordersContainer = document.getElementById('table-orders');
        const noOrdersMessage = document.getElementById('no-orders-message');
        
        // Clear previous content first
        ordersContainer.innerHTML = '';
        
        // Get authentication token and username
        const username = localStorage.getItem('username');
        const authToken = localStorage.getItem('auth_token');
        
        if (!username || !authToken) {
            throw new Error('Authentication details missing');
        }
        
        // Show loading indicator
        ordersContainer.innerHTML = `
            <div class="center-align" style="padding: 20px;">
                <div class="preloader-wrapper small active">
                    <div class="spinner-layer spinner-blue-only">
                        <div class="circle-clipper left"><div class="circle"></div></div>
                        <div class="gap-patch"><div class="circle"></div></div>
                        <div class="circle-clipper right"><div class="circle"></div></div>
                    </div>
                </div>
                <p>Loading orders...</p>
            </div>
        `;
        
        // Fetch orders from API - use the username to get all orders for this business
        const response = await fetch(`../api/orders?username=${encodeURIComponent(username)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load orders');
        }
        
        // Get the current username from localStorage for filtering
        const currentUsername = localStorage.getItem('username');
        
        // Filter orders for this specific table, with the relevant statuses, and matching username
        const tableOrders = result.data.filter(order => 
            order.table_number === table.TABLE_NUMBER && 
            ['NEW', 'PREPARING', 'READY'].includes(order.status?.toUpperCase()) &&
            order.username === currentUsername // Add username filter
        );
        
        // Update our table data with the filtered orders
        table.orders = tableOrders;
        
        // Clear the container
        ordersContainer.innerHTML = '';
        
        if (tableOrders.length === 0) {
            // Show the no orders message if there are no orders
            if (!noOrdersMessage) {
                const message = document.createElement('p');
                message.id = 'no-orders-message';
                message.style.fontSize = '1.5rem';
                message.style.padding = '1rem';
                message.style.textAlign = 'center';
                message.textContent = 'No active orders for this table.';
                ordersContainer.appendChild(message);
            } else {
                noOrdersMessage.style.display = 'block';
                noOrdersMessage.style.fontSize = '1.5rem';
                noOrdersMessage.style.padding = '1rem';
                noOrdersMessage.style.textAlign = 'center';
            }
            return;
        }
        
        // Hide no orders message if we have orders
        if (noOrdersMessage) {
            noOrdersMessage.style.display = 'none';
        }
        
        // Display each order with simplified and larger UI
        tableOrders.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            
            // Calculate total items in the order
            const totalItems = order.order_items ? order.order_items.length : 0;
            
            // Format the timestamp
            const orderTime = new Date(order.created_at);
            const formattedTime = orderTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const formattedDate = orderTime.toLocaleDateString();
            
            // Calculate the total amount if not provided
            const orderTotal = order.total_amount || 
                (order.order_items ? order.order_items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0) : 0);
            
            // Create status class based on the order status
            let statusClass = '';
            let statusText = order.status || 'pending';
            switch(order.status?.toUpperCase()) {
                case 'PENDING':
                    statusClass = 'orange';
                    break;
                case 'READY':
                    statusClass = 'green';
                    break;
                case 'NEW':
                    statusClass = 'blue';
                    break;
                case 'PREPARING':
                    statusClass = 'amber';
                    break;
                default:
                    statusClass = 'grey';
            }
            
            // Create the order header with order number and status
            const orderHeader = document.createElement('div');
            orderHeader.className = 'order-header';
            orderHeader.innerHTML = `
                <div class="order-number">#${order.order_number || order.id}</div>
                <div class="order-status ${statusClass}">${statusText}</div>
            `;
            
            // Create the main order content with simplified info
            const orderContent = document.createElement('div');
            orderContent.style.fontSize = '1.4rem';
            orderContent.style.margin = '1rem 0';
            orderContent.innerHTML = `
                <div style="margin: 8px 0;"><strong>${totalItems}</strong> item${totalItems !== 1 ? 's' : ''}</div>
                <div style="margin: 8px 0;">${formattedTime}</div>
                <div style="margin: 8px 0; color: var(--success-color); font-size: 1.6rem; font-weight: bold;">
                    RM ${parseFloat(orderTotal).toFixed(2)}
                </div>
            `;
            
            // Add simple order items list if available
            if (order.order_items && order.order_items.length > 0) {
                const itemsList = document.createElement('div');
                itemsList.className = 'order-details';
                itemsList.style.fontSize = '1.2rem';
                
                let itemsHTML = '<ul style="margin: 0; padding-left: 20px;">';
                order.order_items.forEach(item => {
                    const itemQuantity = parseInt(item.quantity) || 1;
                    itemsHTML += `<li><strong>${itemQuantity}x</strong> ${item.name}</li>`;
                });
                itemsHTML += '</ul>';
                
                itemsList.innerHTML = itemsHTML;
                
                // Append all elements
                orderItem.appendChild(orderHeader);
                orderItem.appendChild(orderContent);
                orderItem.appendChild(itemsList);
            } else {
                // If no order items, just append header and content
                orderItem.appendChild(orderHeader);
                orderItem.appendChild(orderContent);
            }
            
            // Append the complete order item to the container
            ordersContainer.appendChild(orderItem);
        });
        
    } catch (error) {
        console.error('Error loading table orders:', error);
        const ordersContainer = document.getElementById('table-orders');
        ordersContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--danger-color); font-size: 1.2rem;">
                <i class="material-icons" style="font-size: 2rem;">error</i>
                <p>Error loading orders: ${error.message}</p>
            </div>
        `;
        M.toast({html: `Error loading orders: ${error.message}`, classes: 'red'});
    }
}
