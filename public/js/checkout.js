// Order checkout and confirmation functionality
(function() {
    // Initialize variables
    let orderConfirmModal;
    let orderItems = [];
    let totalAmount = 0;
    let serviceFee = 0;
    const SERVICE_FEE_RATE = 0.05; // 5% service fee

    // Initialize on document ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize Bootstrap modal
        const orderConfirmModalElement = document.getElementById('orderConfirmModal');
        if (orderConfirmModalElement) {
            orderConfirmModal = new bootstrap.Modal(orderConfirmModalElement);
            
            // Add event listener for submit order button
            const submitOrderBtn = document.getElementById('submitOrderBtn');
            if (submitOrderBtn) {
                submitOrderBtn.addEventListener('click', submitOrder);
            }
        }
        
        // Global function to handle proceeding to checkout
        window.proceedToCheckout = function() {
            // Close cart modal first (if open)
            const cartModal = document.getElementById('cartModal');
            if (cartModal) {
                const bsCartModal = bootstrap.Modal.getInstance(cartModal);
                if (bsCartModal) {
                    bsCartModal.hide();
                }
            }
            
            // Get the cart items
            loadCartItems();
            
            // Calculate totals
            calculateOrderTotals();
            
            // Populate the modal with order details
            populateOrderConfirmation();
            
            // Show the confirmation modal
            setTimeout(() => {
                orderConfirmModal.show();
            }, 350); // Add a small delay to ensure the cart modal closes first
        };
    });

    // Load cart items from localStorage
    function loadCartItems() {
        try {
            const cartData = localStorage.getItem('food_cart');
            if (cartData) {
                orderItems = JSON.parse(cartData) || [];
                console.log('Loaded order items:', orderItems);
            } else {
                orderItems = [];
            }
        } catch (error) {
            console.error('Error loading cart items:', error);
            orderItems = [];
        }
    }

    // Calculate order totals including service fee
    function calculateOrderTotals() {
        // Calculate subtotal from all items
        const subtotal = orderItems.reduce((total, item) => {
            return total + (item.totalPrice * item.quantity);
        }, 0);
        
        // Calculate service fee
        serviceFee = subtotal * SERVICE_FEE_RATE;
        
        // Calculate total amount
        totalAmount = subtotal + serviceFee;
        
        console.log(`Order calculation: Subtotal: ${subtotal.toFixed(2)}, Service Fee: ${serviceFee.toFixed(2)}, Total: ${totalAmount.toFixed(2)}`);
        
        return {
            subtotal,
            serviceFee,
            totalAmount
        };
    }

    // Populate the order confirmation modal with items and totals
    function populateOrderConfirmation() {
        const orderConfirmItems = document.getElementById('orderConfirmItems');
        const orderSubtotal = document.getElementById('orderSubtotal');
        const orderServiceFee = document.getElementById('orderServiceFee');
        const orderGrandTotal = document.getElementById('orderGrandTotal');
        
        if (!orderConfirmItems) return;
        
        // Clear previous items
        orderConfirmItems.innerHTML = '';
        
        // Add items to the confirmation modal
        orderItems.forEach(item => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-confirm-item';
            
            // Format variations for display
            const variationsText = item.variations && item.variations.length > 0 
                ? item.variations.map(v => v.name).join(', ') 
                : '';
            
            orderItem.innerHTML = `
                <div class="order-confirm-item-details">
                    <div class="order-confirm-item-name">${item.name} × ${item.quantity}</div>
                    <div class="order-confirm-item-variations">${variationsText}</div>
                </div>
                <div class="order-confirm-item-price">RM${(item.totalPrice * item.quantity).toFixed(2)}</div>
            `;
            
            orderConfirmItems.appendChild(orderItem);
        });
        
        // Update totals
        const { subtotal, serviceFee, totalAmount } = calculateOrderTotals();
        
        if (orderSubtotal) orderSubtotal.textContent = `RM${subtotal.toFixed(2)}`;
        if (orderServiceFee) orderServiceFee.textContent = `RM${serviceFee.toFixed(2)}`;
        if (orderGrandTotal) orderGrandTotal.textContent = `RM${totalAmount.toFixed(2)}`;
    }

    // Submit the order to the server
    async function submitOrder() {
        try {
            // Get customer information
            const customerName = document.getElementById('orderCustomerName').value.trim();
            const customerPhone = document.getElementById('orderCustomerPhone').value.trim();
            const orderNotes = document.getElementById('orderNotes').value.trim();
            
            // Validate required fields
            if (!customerName) {
                showToast('Please enter your name', '', 'error');
                return;
            }
            
            if (!customerPhone) {
                showToast('Please enter your phone number', '', 'error');
                return;
            }
            
            // Get current business/store info
            const businessName = localStorage.getItem('businessname') || sessionStorage.getItem('businessname') || '';
            const tableNo = localStorage.getItem('table_no') || sessionStorage.getItem('table_no') || '';
            const username = localStorage.getItem('username') || sessionStorage.getItem('username') || '';
            
            // Disable the submit button and show loading state
            const submitOrderBtn = document.getElementById('submitOrderBtn');
            if (submitOrderBtn) {
                submitOrderBtn.disabled = true;
                submitOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            }
            
            // Calculate totals one more time to ensure accuracy
            const { subtotal, serviceFee, totalAmount } = calculateOrderTotals();
            
            // Create order object
            const order = {
                customer: {
                    name: customerName,
                    phone: customerPhone
                },
                business: {
                    username: username,
                    name: businessName,
                    tableNo: tableNo
                },
                orderItems: orderItems,
                totals: {
                    subtotal: subtotal,
                    serviceFee: serviceFee,
                    total: totalAmount
                },
                notes: orderNotes,
                orderDate: new Date().toISOString(),
                status: 'PENDING'
            };
            
            console.log('Submitting order:', order);
            
            // Get auth token
            const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            
            // Submit to server
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken ? `Bearer ${authToken}` : ''
                },
                body: JSON.stringify(order)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit order');
            }
            
            const data = await response.json();
            
            // Hide the confirmation modal
            orderConfirmModal.hide();
            
            // Clear the cart
            localStorage.removeItem('food_cart');
            
            // Show success message
            showToast('Order submitted successfully!', '', 'success');
            
            // Reset the cart counter
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            }
            
            // Optionally redirect to order tracking page
            // window.location.href = `/order-tracking.html?orderId=${data.orderId}`;
            
            console.log('Order successful:', data);
        } catch (error) {
            console.error('Error submitting order:', error);
            showToast('Failed to submit order: ' + error.message, '', 'error');
            
            // Re-enable the submit button
            const submitOrderBtn = document.getElementById('submitOrderBtn');
            if (submitOrderBtn) {
                submitOrderBtn.disabled = false;
                submitOrderBtn.textContent = 'Submit Order';
            }
        }
    }

    // Generic Toast function - Using the existing toast system
    function showToast(message, title, type) {
        if (typeof window.showSuccess === 'function' && type === 'success') {
            window.showSuccess(message);
        } else if (typeof window.showError === 'function' && type === 'error') {
            window.showError(message);
        } else if (typeof window.showInfo === 'function') {
            window.showInfo(message, title);
        } else {
            // Fallback if the global toast functions don't exist
            alert(message);
        }
    }
})();