/**
 * FoodBao Admin Dashboard - Core Application
 * Simplified Version
 */

// Authentication check using localStorage
function checkAuth() {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) {
        // Not logged in, redirect to login page
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        // Decode and verify token
        const decoded = JSON.parse(atob(token));
        
        // Check if token is expired
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            logout();
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Invalid token format', e);
        logout();
        return false;
    }
}

// API communication with Supabase through proxy
async function fetchData(action, params = {}) {
    // Ensure we're authenticated
    if (!checkAuth()) return null;
    
    try {
        const response = await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action,
                ...params
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        showToast('Error fetching data: ' + error.message, 'error');
        return null;
    }
}

// UI helpers
function showToast(message, type = 'info') {
    // Use Materialize toast if available
    if (typeof M !== 'undefined' && M.toast) {
        const classes = {
            'info': 'blue',
            'success': 'green',
            'warning': 'orange',
            'error': 'red'
        };
        
        M.toast({
            html: message,
            classes: classes[type] || 'blue'
        });
    } else {
        alert(message);
    }
}

// User profile from localStorage
function loadUserProfile() {
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    const userEmail = localStorage.getItem('user_email');
    
    // Update UI with user info
    document.querySelectorAll('.user-name, #user-name, #nav-username, #sidenav-username').forEach(el => {
        if (el) el.textContent = username || 'User';
    });
    
    document.querySelectorAll('.user-role, #nav-userrole, #sidenav-userrole').forEach(el => {
        if (el) el.textContent = userRole || 'User';
    });
    
    return {
        username,
        userId,
        userRole,
        userEmail
    };
}

// Logout function
function logout() {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    
    // Redirect to login
    window.location.href = '/login.html?logout=true';
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!checkAuth()) return;
    
    // Initialize UI components
    if (typeof M !== 'undefined') {
        M.AutoInit();
        
        // Initialize sidenav
        const sidenavElems = document.querySelectorAll('.sidenav');
        if (sidenavElems.length) {
            M.Sidenav.init(sidenavElems);
        }
        
        // Initialize dropdown menus
        const dropdownElems = document.querySelectorAll('.dropdown-trigger');
        if (dropdownElems.length) {
            M.Dropdown.init(dropdownElems);
        }
    }
    
    // Load user profile
    loadUserProfile();
    
    // Set up logout button
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });

});

document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialization started');
    
    // Check if authService is available
    if (typeof authService === 'undefined') {
        console.error('AuthService not loaded! Check script loading order.');
        return;
    }
    
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        console.warn('User not authenticated, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('User is authenticated, loading food items');
    
    // Set the username in the welcome message
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        const user = authService.getCurrentUser();
        console.log('Current user:', user);
        userNameElement.textContent = user ? user.username : 'User';
    }
    
    // Load food items
    loadFoodItems();
    
    // Initialize any UI components
    initUI();
});

function loadFoodItems() {
    console.log('Loading food items (using sample data until API is available)');
    
    // Use sample data instead of API call for now
    const sampleFoodItems = [
        { id: 1, name: 'Hamburger', price: 5.99, image: 'src/img/hamburger.jpg', description: 'Classic beef patty with lettuce, tomato, and special sauce', category: 'Main' },
        { id: 2, name: 'Pizza', price: 8.99, image: 'src/img/pizza.jpg', description: 'Fresh baked crust with your choice of toppings', category: 'Main' },
        { id: 3, name: 'Salad', price: 4.99, image: 'src/img/salad.jpg', description: 'Fresh greens with seasonal vegetables and dressing', category: 'Side' },
        { id: 4, name: 'Pasta', price: 7.99, image: 'src/img/pasta.jpg', description: 'Al dente pasta with homemade sauce', category: 'Main' },
        { id: 5, name: 'Fried Rice', price: 6.99, image: 'src/img/fried-rice.jpg', description: 'Stir-fried rice with vegetables and choice of protein', category: 'Main' },
        { id: 6, name: 'Ice Cream', price: 3.99, image: 'src/img/ice-cream.jpg', description: 'Creamy dessert in various flavors', category: 'Dessert' }
    ];
    
    // Use the sample data directly
    renderFoodItems(sampleFoodItems);
 
}

function initUI() {
    console.log('Initializing UI components');
    
    // Check if Materialize is loaded
    if (typeof M === 'undefined') {
        console.error('Materialize JS not loaded! Waiting 500ms and trying again...');
        setTimeout(initUI, 500);
        return;
    }
    
    console.log('Materialize found, initializing components');
    
    // Initialize sidenav
    const sidenavElems = document.querySelectorAll('.sidenav');
    if (sidenavElems.length) {
        const instances = M.Sidenav.init(sidenavElems);
        console.log('Sidenav initialized successfully');
    } else {
        console.warn('No sidenav elements found');
    }
    
    // Initialize dropdown menus
    const dropdownElems = document.querySelectorAll('.dropdown-trigger');
    if (dropdownElems.length) {
        M.Dropdown.init(dropdownElems, {
            coverTrigger: false,
            constrainWidth: false
        });
        console.log('Dropdowns initialized successfully');
    }
    
    // Initialize other Materialize components as needed
    // Tooltips, modals, etc.
    
    // Update username in header
    const headerComp = document.querySelector('app-header');
    if (headerComp && typeof headerComp.updateUsername === 'function') {
        headerComp.updateUsername();
    }
    
    // Add event listener for logo to open sidenav
    const logoTrigger = document.querySelector('.brand-logo');
    if (logoTrigger) {
        logoTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            const sidenavInstance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
            if (sidenavInstance) {
                sidenavInstance.open();
            }
        });
    }
}

// Call initUI after DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing app');
    initUI();
});

// Sample code to render food items with Materialize CSS
function renderFoodItems(foodItems) {
    const container = document.getElementById('food-items-container');
    
    // Check if container exists
    if (!container) {
        console.warn('Food items container not found in current page. Creating it dynamically.');
        
        // Create the container
        const appContent = document.getElementById('app-content');
        if (!appContent) {
            console.error('Cannot display food items: app-content element not found');
            return;
        }
        
        // Create a row for the heading
        const headingRow = document.createElement('div');
        headingRow.className = 'row';
        headingRow.innerHTML = '<div class="col s12"><h6 class="teal-text">Popular Food Items</h6></div>';
        appContent.appendChild(headingRow);
        
        // Create the container for food items
        const foodContainer = document.createElement('div');
        foodContainer.id = 'food-items-container';
        foodContainer.className = 'row';
        appContent.appendChild(foodContainer);
        
        // Use the newly created container
        return renderFoodItems(foodItems);
    }
    
    container.innerHTML = '';
    
    foodItems.forEach(item => {
        const foodCard = document.createElement('div');
        foodCard.className = 'col s12 m6 l4';
        
        foodCard.innerHTML = `
            <div class="card hoverable">
                <div class="card-image">
                    <img src="${item.image || 'images/default-food.jpg'}">
                    <span class="card-title">${item.name}</span>
                    <a class="btn-floating halfway-fab waves-effect waves-light red add-to-cart"
                       data-id="${item.id}">
                        <i class="material-icons">add</i>
                    </a>
                </div>
                <div class="card-content">
                    <p class="truncate">${item.description}</p>
                    <div class="chip teal white-text">${item.category}</div>
                    <p class="right-align">
                        <strong>$${item.price.toFixed(2)}</strong>
                    </p>
                </div>
            </div>
        `;
        
        container.appendChild(foodCard);
    });
    
    // Add event listeners for add-to-cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', e => {
            const foodId = e.currentTarget.getAttribute('data-id');
            addToCart(foodId);
            
            // Show a toast notification
            M.toast({
                html: 'Added to cart!',
                classes: 'rounded teal'
            });
        });
    });
}

function renderSampleItems() {
    const foodItemsContainer = document.getElementById('food-items-container');
    if (!foodItemsContainer) return;
    
    // Sample food items
    const foodItems = [
        { id: 1, name: 'Hamburger', price: 5.99, image: 'src/img/hamburger.jpg', description: 'Classic beef patty with lettuce, tomato, and special sauce' },
        { id: 2, name: 'Pizza', price: 8.99, image: 'src/img/pizza.jpg', description: 'Fresh baked crust with your choice of toppings' },
        { id: 3, name: 'Salad', price: 4.99, image: 'src/img/salad.jpg', description: 'Fresh greens with seasonal vegetables and dressing' },
        { id: 4, name: 'Pasta', price: 7.99, image: 'src/img/pasta.jpg', description: 'Al dente pasta with homemade sauce' }
    ];
    
    // Render food items
    foodItemsContainer.innerHTML = `
        <h2>Our Menu</h2>
        <div class="food-items-grid">
            ${foodItems.map(item => `
                <div class="food-item">
                    <div class="food-img">
                        <img src="${item.image}" onerror="this.onerror=null; this.src='src/img/placeholder.jpg';" alt="${item.name}">
                    </div>
                    <div class="food-info">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <div class="food-price">$${item.price.toFixed(2)}</div>
                        <button class="btn" onclick="addToCart(${item.id})">Add to Cart</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper function to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Make addToCart function globally available without authService dependency
window.addToCart = function(id) {
    if (!checkAuth()) {
        alert('Please log in to add items to cart');
        return;
    }
    
    alert(`Item ${id} added to cart!`);
    // In a real app, you would implement cart functionality with API calls
};

/**
 * Main application script for FoodBao Admin Dashboard
 */
const FoodBaoAdmin = {
    /**
     * Initialize the application
     */
    init() {
        console.log('Initializing FoodBao Admin Dashboard...');
        
        // Check authentication
        if (!authService.isAuthenticated()) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        // Initialize Materialize components
        this.initMaterialize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('FoodBao Admin Dashboard initialized successfully');
    },
    
    /**
     * Initialize Materialize components
     */
    initMaterialize() {
        if (typeof M === 'undefined') {
            console.error('Materialize JS not loaded');
            return;
        }
        
        // Initialize all Materialize components
        M.AutoInit();
        
        // Specific initialization for dropdowns
        const dropdowns = document.querySelectorAll('.dropdown-trigger');
        if (dropdowns.length) {
            M.Dropdown.init(dropdowns, {
                coverTrigger: false,
                constrainWidth: false
            });
        }
        
        // Initialize tooltips
        const tooltips = document.querySelectorAll('.tooltipped');
        if (tooltips.length) {
            M.Tooltip.init(tooltips);
        }
        
        // Initialize modals
        const modals = document.querySelectorAll('.modal');
        if (modals.length) {
            M.Modal.init(modals);
        }
    },
    
    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Handle date range picker click
        const dateRange = document.querySelector('.date-range');
        if (dateRange) {
            dateRange.addEventListener('click', () => {
                M.toast({html: 'Date range picker coming soon!', classes: 'rounded'});
            });
        }
        
        // Listen for logout clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn')) {
                e.preventDefault();
                authService.logout();
            }
        });
    },
    
    /**
     * Show a loading spinner
     * @param {string} elementId - ID of container element
     * @param {boolean} show - Whether to show or hide the spinner
     */
    showLoader(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => FoodBaoAdmin.init());

// Export functions for global use
window.FoodBaoApp = {
    checkAuth,
    logout,
    loadUserProfile,
    initUI,
    showToast
};

// Fetch user profile
async function fetchUserProfile() {
    const username = localStorage.getItem('username');
    if (!username) return;

    try {
        const response = await fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                // Store client data in a global variable or localStorage if needed
                console.log('Profile data loaded successfully');
                // Update UI elements if needed
                updateUserInterface(data.data);
            }
        } else {
            console.log('User profile not found, using default values');
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
    }
}

function updateUserInterface(profileData) {
    // Update any UI elements with the profile data
    // For example:
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        if (el) el.textContent = profileData.CONTACT_PERSON || profileData.USERNAME;
    });
    
    // Update user avatar if it exists
    const userAvatars = document.querySelectorAll('.user-avatar');
    if (profileData.IMGLOGO) {
        userAvatars.forEach(avatar => {
            if (avatar) avatar.src = profileData.IMGLOGO;
        });
    }
}

// Call the function
document.addEventListener('DOMContentLoaded', fetchUserProfile);

// Basic app initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized');
  
  // Simple auth check that doesn't depend on authService
  if (typeof window.authService === 'undefined') {
    window.authService = {
      init: function() { console.log('Auth fallback initialized'); },
      isAuthenticated: function() { 
        return !!localStorage.getItem('auth_token');
      },
      getUsername: function() { return localStorage.getItem('username'); },
      getUserRole: function() { return localStorage.getItem('user_role'); },
      logout: function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
      }
    };
  }
  
  // Initialize auth service
  if (window.authService && typeof window.authService.init === 'function') {
    window.authService.init();
  }
});