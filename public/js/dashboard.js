/**
 * Dashboard specific functionality
 */
const Dashboard = {
    /**
     * Initialize dashboard
     */
    init() {
        console.log('Initializing dashboard...');
        this.loadData();
    },
    
    /**
     * Load dashboard data
     */
    async loadData() {
        try {
            // Show loading spinner
            FoodBaoAdmin.showLoader('dashboard-loading', true);
            
            // In a real app, this would fetch from your API
            // For demo purposes, we'll use a timeout to simulate API call
            setTimeout(() => {
                this.updateStats({
                    users: 156,
                    orders: 423,
                    revenue: 12845,
                    products: 64
                });
                
                this.updateRecentOrders();
                
                // Hide loading spinner
                FoodBaoAdmin.showLoader('dashboard-loading', false);
            }, 1000);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            FoodBaoAdmin.showLoader('dashboard-loading', false);
            
            // Show error message
            M.toast({
                html: 'Error loading dashboard data', 
                classes: 'rounded red'
            });
        }
    },
    
    /**
     * Update dashboard statistics
     * @param {Object} stats - Statistics to display
     */
    updateStats(stats) {
        // Update user count with animation
        this.animateCounter('users-count', 0, stats.users);
        
        // Update orders count with animation
        this.animateCounter('orders-count', 0, stats.orders);
        
        // Update revenue with animation
        this.animateCounter('revenue-total', 0, stats.revenue, (value) => {
            return '$' + value.toLocaleString();
        });
        
        // Update products count with animation
        this.animateCounter('products-count', 0, stats.products);
    },
    
    /**
     * Animate a counter from start to end value
     * @param {string} elementId - ID of element to animate
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {Function} formatter - Optional formatter function
     */
    animateCounter(elementId, start, end, formatter = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const duration = 1500; // ms
        const frameRate = 60;
        const steps = Math.ceil(duration / (1000 / frameRate));
        const increment = (end - start) / steps;
        
        let current = start;
        let step = 0;
        
        const updateCounter = () => {
            step++;
            current += increment;
            
            // Ensure we end exactly at the target value
            if (step >= steps) current = end;
            
            // Format the value if formatter is provided
            element.textContent = formatter ? formatter(Math.round(current)) : Math.round(current).toLocaleString();
            
            // Continue animation if not finished
            if (step < steps) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        // Start animation
        updateCounter();
    },
    
    /**
     * Update recent orders table
     */
    updateRecentOrders() {
        const ordersTable = document.getElementById('recent-orders');
        if (!ordersTable) return;
        
        // Sample orders data
        const orders = [
            { id: 'ORD-1001', customer: 'John Smith', date: 'Mar 25, 2025', amount: 45.99, status: 'Completed' },
            { id: 'ORD-1002', customer: 'Jane Doe', date: 'Mar 24, 2025', amount: 32.50, status: 'Processing' },
            { id: 'ORD-1003', customer: 'Bob Johnson', date: 'Mar 23, 2025', amount: 78.25, status: 'Cancelled' },
            { id: 'ORD-1004', customer: 'Alice Brown', date: 'Mar 22, 2025', amount: 19.99, status: 'Completed' },
            { id: 'ORD-1005', customer: 'Tom Wilson', date: 'Mar 21, 2025', amount: 125.00, status: 'Delivered' }
        ];
        
        // Clear loading message
        ordersTable.innerHTML = '';
        
        // Add orders with staggered animation
        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            row.style.opacity = '0';
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.date}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.status)}">
                        ${order.status}
                    </span>
                </td>
                <td>$${order.amount.toLocaleString()}</td>
                <td>
                    <a href="order-details.html?id=${order.id}" class="btn-small waves-effect">
                        <i class="material-icons">visibility</i>
                    </a>
                </td>
            `;
            ordersTable.appendChild(row);
            
            // Staggered animation
            setTimeout(() => {
                row.style.transition = 'opacity 0.5s';
                row.style.opacity = '1';
            }, index * 100);
        });
    },
    
    /**
     * Get status CSS class
     * @param {string} status - Order status
     * @returns {string} - CSS class for status
     */
    getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'status-completed';
            case 'delivered':
                return 'status-delivered';
            case 'processing':
                return 'status-processing';
            case 'pending':
                return 'status-pending';
            case 'cancelled':
                return 'status-cancelled';
            default:
                return '';
        }
    }
};

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', function() {
    // After authentication check
    if (window.app && window.app.checkAuth()) {
        Dashboard.init();
    }
});