class AppHeader extends HTMLElement {
    connectedCallback() {
        // Set initial HTML structure first
        this.innerHTML = `
            <header>
                <div class="navbar-fixed">
                    <nav class="blue darken-2" id="main-nav">
                        <div class="nav-wrapper container-flush">
                            <!-- Replace logo with menu icon (hamburger) -->
                            <a href="#!" class="sidenav-trigger show-on-large" data-target="mobile-nav" id="nav-menu-trigger">
                                <i class="material-icons">menu</i>
                            </a>
                            
                            <!-- Username and Role with improved center-right alignment -->
                            <div class="user-display">
                                <div class="user-text-container">
                                    <span id="nav-username" class="username truncate">User</span>
                                    <span class="role-separator">-</span>
                                    <span id="nav-userrole" class="userrole truncate">Role</span>
                                </div>
                            </div>
                            
                            <!-- Header Icons (Profile, Logout) -->
                            <ul class="right" style="margin-right: 16px;">
                                <!-- Profile Icon Button -->
                                <li><a href="pages/profile.html" id="profile-btn" class="tooltipped profile-button" data-position="bottom" data-tooltip="Profile">
                                    <i class="material-icons">account_circle</i>
                                </a></li>
                                <!-- Logout button -->
                                <li><a href="#!" id="topnav-logout-btn" class="tooltipped logout-button" data-position="bottom" data-tooltip="Logout">
                                    <i class="material-icons">exit_to_app</i>
                                </a></li>
                            </ul>
                        </div>
                    </nav>
                </div>
                
                <!-- Mobile sidenav structure - updated to blue theme -->
                <ul id="mobile-nav" class="sidenav narrower-sidenav">
                    <li>
                        <div class="user-view center-align">
                            <div class="background blue darken-3" id="sidenav-background">
                                <!-- Dynamic background will be applied here -->
                            </div>
                            <a href="index.html" class="center-align">
                                <img class="square-avatar" id="user-avatar" src="img/FBLogo2.png" alt="User">
                            </a>
                            <a href="index.html" class="center-align">
                                <span class="white-text name" id="sidenav-username">User</span>
                                <span class="white-text email" id="sidenav-userrole"></span>
                            </a>
                        </div>
                    </li>
                    
                    <li class="menu-transition-gradient"></li>
                    
                    <!-- Updated menu structure with blue accents, and added Client menu item -->
                    <li id="clients-menu-item"><a href="pages/clientsrch.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">people</i>Clients</a></li>
                    <li><a href="pages/orders.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">receipt</i>Orders</a></li>
                    <li><a href="pages/tables.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">grid_on</i>Tables</a></li>
                    <li><a href="pages/history.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">history</i>History</a></li>
                    <li><a href="pages/credit.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">credit_card</i>Credits</a></li>
                    <li><a href="pages/menu.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">menu_book</i>Menu</a></li>
                    <li class="nested-submenu">
                        <a href="#" class="submenu-trigger blue-text text-darken-4">
                            <i class="material-icons left blue-text text-darken-2">settings</i>Menu Management
                            <i class="material-icons right blue-text text-darken-2">expand_more</i>
                        </a>
                        <div class="submenu">
                            <ul>
                                <li><a href="pages/menu-categories.html" data-debug="true" class="blue-text text-darken-3"><i class="material-icons left blue-text text-darken-2">category</i>Categories</a></li>
                                <li><a href="pages/menu-items.html" data-debug="true" class="blue-text text-darken-3"><i class="material-icons left blue-text text-darken-2">restaurant</i>Menu Items</a></li>
                                <li><a href="pages/items-variations.html" class="blue-text text-darken-3"><i class="material-icons left blue-text text-darken-2">tune</i>Variations</a></li>
                            </ul>
                        </div>
                    </li>
                    <!-- Device Setup menu item -->
                    <li><a href="pages/setup.html" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">devices</i>Device Setup</a></li>
                    <li><div class="divider blue lighten-4"></div></li>                  
                    <!-- Logout option -->
                    <li><a href="#" id="sidenav-logout-btn" class="blue-text text-darken-4"><i class="material-icons left blue-text text-darken-2">exit_to_app</i>Logout</a></li>
                </ul>
            </header>
            
            <style>
                /* Custom container with less padding */
                .container-flush {
                    width: 100%;
                    padding: 0 8px;
                }
                
                /* FIXED: Sidenav trigger styling */
                nav .sidenav-trigger {
                    display: block !important;
                    float: left !important;
                    position: relative !important;
                    z-index: 2 !important;
                    height: 64px !important;
                    padding: 0 !important;
                    margin: 0 18px !important;
                    cursor: pointer !important;
                }
                
                /* Menu trigger icon style */
                nav .sidenav-trigger i.material-icons {
                    font-size: 28px !important;
                    line-height: 64px !important;
                    color: white !important;
                    transition: all 0.3s ease !important;
                }
                
                nav .sidenav-trigger:hover i.material-icons {
                    transform: scale(1.1) !important;
                    text-shadow: 0 0 8px rgba(255,255,255,0.4) !important;
                }
                
                /* Make sure header buttons are visible and properly styled */
                .logout-button, .profile-button {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    height: 64px !important;
                    width: 48px !important;
                }
                
                .logout-button i.material-icons, .profile-button i.material-icons {
                    font-size: 24px !important;
                }
                
                /* Icon buttons hover effect */
                .right li a:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                /* Nested submenu styles - updated colors to blue */
                .nested-submenu .submenu {
                    display: none;
                    padding-left: 15px;
                    background-color: #e3f2fd; /* Blue lighten-5 */
                }
                
                .nested-submenu .submenu ul {
                    margin: 0;
                    padding: 0;
                }
                
                .nested-submenu .submenu li a {
                    padding: 0 32px;
                    font-size: 14px;
                }
                
                .nested-submenu.active .submenu {
                    display: block;
                }
                
                .submenu-trigger .material-icons.right {
                    transition: transform 0.3s;
                    margin-left: 0;
                }
                
                .nested-submenu.active .submenu-trigger .material-icons.right {
                    transform: rotate(180deg);
                }
                
                /* Improved style for username and role display */
                .user-display {
                    display: inline-flex;
                    align-items: center;
                    height: 64px;
                    margin-left: 70px;
                    white-space: nowrap;
                    max-width: calc(100% - 170px); /* Increased space for buttons */
                    overflow: hidden;
                    position: absolute;
                    left: 0;
                    right: 106px; /* Leave space for buttons */
                    justify-content: center; /* Center content horizontally */
                }
                
                .user-text-container {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: flex-end; /* Align content to the right */
                    overflow: hidden;
                    font-size: clamp(12px, 2.5vw, 16px); /* Auto-adjusting font size */
                    padding-right: 15px; /* Add space before logout button */
                }
                
                .username {
                    color: white;
                    font-weight: 500;
                    max-width: 130px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .role-separator {
                    color: rgba(255, 255, 255, 0.8);
                    margin: 0 4px;
                }
                
                .userrole {
                    color: rgba(255, 255, 255, 0.9);
                    max-width: 100px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-size: 0.85em;
                }
                
                /* Mobile-specific styles */
                @media only screen and (max-width: 600px) {
                    nav .sidenav-trigger {
                        height: 56px !important;
                    }
                    
                    nav .sidenav-trigger i.material-icons {
                        line-height: 56px !important;
                    }
                    
                    .logout-button, .profile-button {
                        height: 56px !important;
                    }
                    
                    .user-display {
                        height: 56px;
                        margin-left: 60px;
                        max-width: calc(100% - 150px);
                        right: 100px;
                    }
                    
                    .user-text-container {
                        font-size: clamp(11px, 2vw, 14px);
                        padding-right: 10px;
                    }
                    
                    .userrole {
                        max-width: 80px;
                    }
                    
                    /* Ensure icons are visible on mobile */
                    .right {
                        position: absolute !important;
                        right: 0 !important;
                        top: 0 !important;
                    }
                }
                
                /* Extra small screens */
                @media only screen and (max-width: 320px) {
                    .user-display {
                        margin-left: 50px;
                        max-width: calc(100% - 120px);
                        right: 100px;
                    }
                    
                    .username, .userrole {
                        max-width: 60px;
                    }
                    
                    .user-text-container {
                        font-size: clamp(10px, 1.8vw, 12px);
                        padding-right: 5px;
                    }
                }
                
                /* Truncate class for text overflow */
                .truncate {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: inline-block;
                }
                
                /* Narrower sidenav with blue theme */
                .narrower-sidenav {
                    width: 250px !important;
                    background-color: #f8f9ff !important; /* Very light blue background */
                }
                
                /* Adjust sidenav item padding for narrower menu */
                .sidenav li > a {
                    padding: 0 24px;
                }
                
                .sidenav .material-icons {
                    margin-right: 16px;
                }
                
                /* Centered sidenav header */
                .sidenav .user-view {
                    padding: 24px 16px 16px;
                    text-align: center;
                    margin-bottom: 0;
                    position: relative;
                    height: 176px; /* Fixed height for background image */
                }
                
                /* Square avatar style for user */
                .sidenav .user-view .square-avatar {
                    height: 80px;
                    width: 80px;
                    margin: 0 auto 12px;
                    display: block;
                    object-fit: cover;
                    border-radius: 4px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    border: 2px solid #bbdefb; /* Blue lighten-4 border */
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                
                .sidenav .user-view .square-avatar:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    border-color: #ffffff;
                }
                
                /* Dynamic background styling with enhanced effects */
                .sidenav .user-view .background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-size: cover;
                    background-position: center;
                    transition: all 0.3s ease-in-out;
                }
                
                /* Improved gradient overlay for better text readability with blue tint */
                .sidenav .user-view .background:after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 80%;
                    background: linear-gradient(to bottom, 
                                   rgba(13, 71, 161, 0.2) 0%, /* Blue darken-4 with opacity */
                                   rgba(13, 71, 161, 0.7) 70%, 
                                   rgba(13, 71, 161, 0.9) 100%);
                    z-index: 1;
                }
                
                /* Menu transition element for smooth fade between image and menu */
                .sidenav .menu-transition-gradient {
                    height: 10px;
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(to bottom, rgba(25, 118, 210, 0.2) 0%, rgba(255,255,255,0) 100%); /* Blue darken-2 with opacity */
                    position: relative;
                    z-index: 2;
                }
                
                /* Make sure content is above the gradient */
                .sidenav .user-view a {
                    position: relative;
                    z-index: 2;
                }
                
                .sidenav .user-view .name {
                    display: block;
                    font-size: 16px;
                    margin-bottom: 4px;
                    font-weight: 500;
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
                }
                
                .sidenav .user-view .email {
                    display: block;
                    font-size: 12px;
                    opacity: 0.9;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
                }
                
                /* Dynamic header background for blue theme */
                nav.with-banner {
                    background-image: var(--banner-image) !important;
                    background-size: cover !important;
                    background-position: center !important;
                    position: relative !important;
                }
                
                nav.with-banner:before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(25, 118, 210, 0.85); /* Blue darken-2 with opacity */
                    z-index: 0;
                }
                
                nav.with-banner .nav-wrapper {
                    position: relative;
                    z-index: 1;
                }
                
                /* Back button styling - updated to blue */
                .back-button {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 56px;
                    height: 56px;
                    border-radius: 4px !important; /* Square style */
                    background-color: #1976d2 !important; /* Blue darken-2 */
                    color: white;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
                    cursor: pointer;
                }
                
                .back-button:hover {
                    box-shadow: 0 6px 12px rgba(0,0,0,0.25), 0 5px 5px rgba(0,0,0,0.22);
                    transform: translateY(-2px);
                    background-color: #0d47a1 !important; /* Blue darken-4 */
                }
                
                .back-button i {
                    font-size: 24px;
                }
                
                /* Fix top spacing for inner pages */
                .inner-page {
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                .inner-page .navbar-fixed {
                    position: sticky;
                    top: 0;
                    z-index: 998;
                }
                
                /* Ensure content starts right after navbar without gaps */
                .inner-page-content {
                    margin-top: 0;
                    padding-top: 0;
                }
                
                /* Special blue theme styles for hover effects */
                .sidenav li > a:hover {
                    background-color: rgba(33, 150, 243, 0.1); /* Blue with opacity */
                }
                
                .sidenav li > a:active {
                    background-color: rgba(33, 150, 243, 0.2); /* Blue with higher opacity */
                }
                
                /* Specific pulse animation for important buttons */
                @keyframes bluePulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
                    }
                }
            </style>
        `;
        
        // Initialize sidenav
        this._initSidenav();
        
        // Fix paths for images and links
        this.fixRelativePaths();
        
        // Load dynamic backgrounds
        this.loadDynamicBackgrounds();
        
        // Update user info
        this.updateUserInfo();
        
        // Add back button to specific pages
        this.addBackButtonIfNeeded();
        
        // Setup event listeners
        this._setupEventListeners();
        this.setupLogoClickHandler();
        this._setupFallbackSidenav();
        this._setupSubmenuHandlers(); // New method for submenu toggling

        // Set up dynamic profile button link
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const username = localStorage.getItem('username');
                if (username) {
                    // Determine if we're in a subdirectory
                    const inSubdirectory = window.location.pathname.includes('/pages/');
                    const basePath = inSubdirectory ? '' : 'pages/';
                    
                    // Navigate to client-profile with username parameter
                    window.location.href = `${basePath}client-profile.html?username=${encodeURIComponent(username)}`;
                } else {
                    console.error('Username not found in localStorage');
                    // Fallback to regular profile page if username not available
                    window.location.href = inSubdirectory ? 'profile.html' : 'pages/profile.html';
                }
            });
            
            // Update the tooltip to be more descriptive
            if (typeof M !== 'undefined') {
                const tooltipInstance = M.Tooltip.getInstance(profileBtn);
                if (tooltipInstance) {
                    tooltipInstance.el.setAttribute('data-tooltip', 'My Profile');
                    tooltipInstance.options.html = 'My Profile';
                } else {
                    profileBtn.setAttribute('data-tooltip', 'My Profile');
                    try {
                        M.Tooltip.init(profileBtn);
                    } catch (e) {
                        console.error('Error initializing tooltip:', e);
                    }
                }
            }
        }

        // Control client menu visibility based on user role
        this.updateMenuBasedOnUserRole();
    }

    // New method to control menu visibility based on user role
    updateMenuBasedOnUserRole() {
        try {
            const userRole = localStorage.getItem('user_role') || '';
            console.log('Checking menu visibility for user role:', userRole);
            
            // Get the clients menu item
            const clientsMenuItem = document.getElementById('clients-menu-item');
            
            if (clientsMenuItem) {
                // Show clients menu item only for ADMIN and AGENT roles
                if (userRole === 'ADMIN' || userRole === 'AGENT') {
                    clientsMenuItem.style.display = 'block';
                    console.log('Showing clients menu for role:', userRole);
                } else {
                    clientsMenuItem.style.display = 'none';
                    console.log('Hiding clients menu for role:', userRole);
                }
            }
        } catch (error) {
            console.error('Error updating menu visibility:', error);
        }
    }
    
    // Enhanced method for loading dynamic backgrounds
    async loadDynamicBackgrounds() {
        try {
            const username = localStorage.getItem('username');
            if (!username) {
                console.log('No username found, using default backgrounds');
                return;
            }
            
            console.log('Loading dynamic backgrounds for user:', username);
            
            // Try loading the blue theme image from the folder
            const blueThemeUrl = 'img/blue theme.jpg';
            
            // Set default blue background color for sidenav
            const sidenavBackground = document.getElementById('sidenav-background');
            if (sidenavBackground) {
                // First try to use the blue theme image
                const img = new Image();
                img.onload = () => {
                    // Image exists, use it
                    sidenavBackground.style.backgroundImage = `url('${blueThemeUrl}')`;
                    sidenavBackground.classList.remove('blue', 'darken-3');
                    sidenavBackground.style.animation = 'fadeInBackground 1.2s ease-out forwards';
                };
                
                img.onerror = async () => {
                    console.log('Blue theme image not found, trying to fetch client banner');
                    
                    // Fetch client record for current user
                    const clientRecord = await this.fetchClientByUsername(username);
                    if (!clientRecord || !clientRecord.success) {
                        console.log('No client record found or error fetching data');
                        return;
                    }
                    
                    const client = clientRecord.client;
                    console.log('Client data loaded:', client);
                    
                    // Apply background image to sidenav if available
                    const backgroundImgUrl = client.BANNER_IMGURL || client.BACKGROUND_IMGURL;
                    if (backgroundImgUrl && this.isValidImageUrl(backgroundImgUrl)) {
                        sidenavBackground.style.backgroundImage = `url('${backgroundImgUrl}')`;
                        sidenavBackground.classList.remove('blue', 'darken-3');
                        
                        // Add a subtle animation effect
                        sidenavBackground.style.animation = 'fadeInBackground 1.2s ease-out forwards';
                    }
                };
                
                img.src = blueThemeUrl;
                
                // Add a style for the animation if it doesn't exist
                if (!document.getElementById('background-animation-style')) {
                    const style = document.createElement('style');
                    style.id = 'background-animation-style';
                    style.textContent = `
                        @keyframes fadeInBackground {
                            from { opacity: 0.4; transform: scale(1.05); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            // Apply complementary styling to the menu transition
            const menuTransition = document.querySelector('.menu-transition-gradient');
            if (menuTransition) {
                menuTransition.style.background = 'linear-gradient(to bottom, rgba(25, 118, 210, 0.2) 0%, rgba(255,255,255,0) 100%)';
            }
            
            // Try to apply blue theme to top nav
            const mainNav = document.getElementById('main-nav');
            if (mainNav) {
                // Try loading the blue theme image first
                const img = new Image();
                img.onload = () => {
                    // Image exists, use it as banner
                    mainNav.style.setProperty('--banner-image', `url('${blueThemeUrl}')`);
                    mainNav.classList.add('with-banner');
                };
                
                img.onerror = async () => {
                    // Fetch client record for current user if not already fetched
                    let client;
                    if (!client) {
                        const clientRecord = await this.fetchClientByUsername(username);
                        if (clientRecord && clientRecord.success) {
                            client = clientRecord.client;
                        }
                    }
                    
                    // Apply banner image if available
                    if (client && client.BANNER_IMGURL && this.isValidImageUrl(client.BANNER_IMGURL)) {
                        mainNav.style.setProperty('--banner-image', `url('${client.BANNER_IMGURL}')`);
                        mainNav.classList.add('with-banner');
                    }
                };
                
                img.src = blueThemeUrl;
            }
            
            // Use Cloudinary URL for logo if user doesn't have their own profile image
            const logoUrl = 'https://res.cloudinary.com/foodbaoimg/image/upload/v1745133668/FBLogo2_a56hmb.png';
            
            // If user has a profile image, use it instead of default logo
            const fetchClientIfNeeded = async () => {
                const clientRecord = await this.fetchClientByUsername(username);
                if (!clientRecord || !clientRecord.success) {
                    return null;
                }
                return clientRecord.client;
            };
            
            let client = await fetchClientIfNeeded();
            const profileImgUrl = client?.PROFILE_IMGURL;
            
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                // Set the logo image (either user profile or default logo)
                if (profileImgUrl && this.isValidImageUrl(profileImgUrl)) {
                    userAvatar.src = profileImgUrl;
                    console.log('Applied profile image to avatar');
                } else {
                    // Use the Cloudinary logo URL as default
                    userAvatar.src = logoUrl;
                    console.log('Applied default logo to avatar');
                }
                
                // Add a nice reveal animation
                userAvatar.style.animation = 'avatarReveal 0.8s ease-out forwards';
                
                // Add animation style if needed
                if (!document.getElementById('avatar-animation-style')) {
                    const style = document.createElement('style');
                    style.id = 'avatar-animation-style';
                    style.textContent = `
                        @keyframes avatarReveal {
                            from { transform: scale(0.8); opacity: 0.5; }
                            to { transform: scale(1); opacity: 1; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
        } catch (error) {
            console.error('Error loading dynamic backgrounds:', error);
        }
    }
    
    // Helper method to fetch client data by username
    async fetchClientByUsername(username) {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found');
            }
            
            const response = await fetch(`../api/clients/by-username/${encodeURIComponent(username)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                return {
                    success: false,
                    message: `Error fetching client: ${response.status}`
                };
            }
            
            const data = await response.json();
            return {
                success: true,
                client: data
            };
        } catch (error) {
            console.error('Error fetching client data:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Helper to validate image URL
    isValidImageUrl(url) {
        if (!url) return false;
        
        // Simple validation - check if it's a string and has common image extensions
        // or comes from Cloudinary
        return typeof url === 'string' && 
               (url.match(/\.(jpeg|jpg|gif|png)$/i) || 
                url.includes('cloudinary.com') || 
                url.includes('res.cloudinary.com'));
    }
    
    // Rest of your existing methods here...
    _initSidenav() {
        // Existing code...
        const init = () => {
            if (typeof M !== 'undefined') {
                const sidenavElems = document.querySelectorAll('.sidenav');
                if (sidenavElems.length) {
                    console.log('Initializing sidenav with Materialize');
                    return M.Sidenav.init(sidenavElems, {
                        edge: 'left',
                        draggable: true,
                        inDuration: 250,
                        outDuration: 200
                    });
                }
            }
            return null;
        };
        
        let instances = init();
        
        window.addEventListener('load', () => {
            if (!instances) {
                console.log('Trying to initialize sidenav after window load');
                instances = init();
                
                if (!instances) {
                    setTimeout(() => {
                        console.log('Final attempt to initialize sidenav');
                        instances = init();
                        
                        if (!instances) {
                            console.warn('Materialize not available, using manual sidenav');
                            this._setupManualSidenav();
                        }
                    }, 1000);
                }
            }
        });
    }
    
    _setupManualSidenav() {
        const trigger = document.querySelector('.sidenav-trigger');
        const sidenav = document.getElementById('mobile-nav');
        
        const style = document.createElement('style');
        style.textContent = `
            .sidenav.manual-open {
                transform: translateX(0) !important;
                visibility: visible !important;
            }
            
            .sidenav-overlay.manual {
                display: block;
                opacity: 1;
                background-color: rgba(0,0,0,0.5);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 997;
            }
        `;
        document.head.appendChild(style);
        
        if (trigger && sidenav) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                sidenav.classList.toggle('manual-open');
                
                if (sidenav.classList.contains('manual-open')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'sidenav-overlay manual';
                    overlay.id = 'sidenav-overlay';
                    document.body.appendChild(overlay);
                    
                    overlay.addEventListener('click', () => {
                        sidenav.classList.remove('manual-open');
                        overlay.remove();
                    });
                } else {
                    const overlay = document.getElementById('sidenav-overlay');
                    if (overlay) overlay.remove();
                }
            });
        }
    }
    
    _setupEventListeners() {
        window.addEventListener('load', () => {
            const trigger = document.getElementById('nav-menu-trigger');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Menu trigger clicked');
                    
                    try {
                        if (typeof M !== 'undefined') {
                            const sidenav = document.getElementById('mobile-nav');
                            const instance = M.Sidenav.getInstance(sidenav);
                            if (instance) {
                                instance.open();
                                return;
                            }
                        }
                    } catch (error) {
                        console.error('Error using Materialize sidenav:', error);
                    }
                    
                    const sidenav = document.getElementById('mobile-nav');
                    if (sidenav) {
                        sidenav.classList.add('manual-open');
                        
                        const overlay = document.createElement('div');
                        overlay.className = 'sidenav-overlay manual';
                        overlay.id = 'sidenav-overlay';
                        document.body.appendChild(overlay);
                        
                        overlay.addEventListener('click', () => {
                            sidenav.classList.remove('manual-open');
                            overlay.remove();
                        });
                    }
                });
            }
            
            const logoutButtons = [
                document.getElementById('topnav-logout-btn'),
                document.getElementById('sidenav-logout-btn')
            ];
            
            logoutButtons.forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.secureLogout();
                    });
                }
            });
            
            if (typeof M !== 'undefined') {
                const tooltipElems = document.querySelectorAll('.tooltipped');
                if (tooltipElems.length) {
                    M.Tooltip.init(tooltipElems);
                }
            }
        });
    }
    
    fixRelativePaths() {
        const inSubdirectory = window.location.pathname.includes('/pages/');
        
        if (inSubdirectory) {
            document.querySelectorAll('.sidenav a').forEach(link => {
                if (link.getAttribute('href').startsWith('#') || 
                    link.getAttribute('href').startsWith('http')) {
                    return;
                }
                
                if (link.getAttribute('href') === 'index.html') {
                    link.setAttribute('href', '../index.html');
                }
                
                const imgElements = link.querySelectorAll('img');
                imgElements.forEach(img => {
                    if (img.getAttribute('src').startsWith('img/')) {
                        img.setAttribute('src', '../' + img.getAttribute('src'));
                    }
                });
                
                if (link.id === 'client-menu-link') {
                    link.setAttribute('href', 'clientsrch.html');
                } else if (!link.getAttribute('href').startsWith('../') && 
                         !link.getAttribute('href').startsWith('#')) {
                    link.setAttribute('href', '../' + link.getAttribute('href'));
                }
            });
            
            const directImages = this.querySelectorAll('img');
            directImages.forEach(img => {
                if (img.getAttribute('src').startsWith('img/')) {
                    img.setAttribute('src', '../' + img.getAttribute('src'));
                }
            });
        }
    }
    
    updateUserInfo() {
        // Get username from localStorage with fallback to sessionStorage
        const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'User';
        const userRole = localStorage.getItem('user_role') || sessionStorage.getItem('user_role') || 'Guest';
        
        // FIXED: Check if we have client data in global context first
        // This ensures we use the authenticated username rather than potentially outdated storage values
        let displayName = username;
        
        // Check for any client data in the window object that may have been set during auth
        if (window.clientData && window.clientData.username) {
            displayName = window.clientData.username;
            // Update localStorage with the correct username
            localStorage.setItem('username', displayName);
            sessionStorage.setItem('username', displayName);
        }
        
        // Now check for business name - only use if it's a valid value (not "123" or other placeholder)
        const storedBusinessName = sessionStorage.getItem('businessName') || localStorage.getItem('businessName');
        
        // FIXED: Don't use "123" or other short values as business name
        if (storedBusinessName && storedBusinessName !== "123" && storedBusinessName.length > 3) {
            displayName = storedBusinessName;
        }
        
        // Store user role in both localStorage and sessionStorage for consistency
        if (userRole !== 'Guest') {
            localStorage.setItem('user_role', userRole);
            sessionStorage.setItem('user_role', userRole);
        }
        
        // Update username in header and sidenav
        const usernameElements = [
            document.getElementById('nav-username'),
            document.getElementById('sidenav-username')
        ];
        
        usernameElements.forEach(element => {
            if (element) element.textContent = displayName;
        });
        
        // Update user role in header and sidenav
        const userRoleElements = [
            document.getElementById('nav-userrole'),
            document.getElementById('sidenav-userrole')
        ];
        
        userRoleElements.forEach(element => {
            if (element) element.textContent = userRole;
        });
        
        console.log('Header component updated with username:', displayName);
    }
    
    secureLogout() {
        console.log('Performing secure logout');
        
        try {
            // Use the enhanced authService logout function if available
            if (typeof window.authService !== 'undefined' && authService && typeof authService.logout === 'function') {
                authService.logout();
                return;
            }
            
            // Fallback if authService isn't available
            const keysToRemove = [
                'auth_token', 
                'username', 
                'user_role',
                'user_id',
                'user_email',
                'token',
                'user',
                'authenticated',
                'last_login',
                'client_id'
            ];
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
            
            // Clear cookies
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            }
            
            // Clear caches if available
            if ('caches' in window) {
                try {
                    caches.keys().then(keyList => {
                        return Promise.all(keyList.map(key => caches.delete(key)));
                    });
                } catch (e) {
                    console.error('Error clearing caches:', e);
                }
            }
            
            // Add cache-busting parameter
            const cacheBuster = new Date().getTime();
            this.redirectToLogin(cacheBuster);
        } catch (error) {
            console.error('Error during logout:', error);
            this.redirectToLogin();
        }
    }
    
    redirectToLogin() {
        const inSubdirectory = window.location.pathname.includes('/pages/');
        const loginPath = inSubdirectory ? '../login.html' : 'login.html';
        
        const cacheBuster = new Date().getTime();
        window.location.href = `${loginPath}?cb=${cacheBuster}`;
    }

    setupLogoClickHandler() {
        window.addEventListener('load', () => {
            const trigger = document.getElementById('nav-menu-trigger');
            if (!trigger) return;
            
            console.log('Setting up logo click handler');
            
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Logo clicked');
                
                const targetId = trigger.getAttribute('data-target');
                const sidenav = document.getElementById(targetId);
                
                if (!sidenav) {
                    console.error('Sidenav element not found:', targetId);
                    return;
                }
                
                if (typeof M !== 'undefined') {
                    try {
                        const instance = M.Sidenav.getInstance(sidenav);
                        if (instance) {
                            console.log('Opening sidenav with Materialize');
                            instance.open();
                            return;
                        }
                    } catch (err) {
                        console.error('Error with Materialize sidenav:', err);
                    }
                }
                
                console.log('Using manual sidenav open');
                sidenav.style.transform = 'translateX(0)';
                sidenav.style.visibility = 'visible';
                
                const overlay = document.createElement('div');
                overlay.className = 'sidenav-overlay manual';
                overlay.addEventListener('click', () => {
                    sidenav.style.transform = '';
                    sidenav.style.visibility = '';
                    overlay.remove();
                });
                document.body.appendChild(overlay);
            });
        });
    }

    _setupFallbackSidenav() {
        setTimeout(() => {
            const trigger = document.querySelector('.sidenav-trigger');
            const sidenav = document.getElementById('mobile-nav');
            
            if (!trigger || !sidenav) {
                console.error('Could not find sidenav elements');
                return;
            }
            
            console.log('Setting up fallback sidenav handler');
            
            sidenav.style.transform = 'translateX(-100%)';
            sidenav.style.transition = 'transform 0.3s';
            sidenav.style.position = 'fixed';
            sidenav.style.top = '0';
            sidenav.style.left = '0';
            sidenav.style.width = '250px';
            sidenav.style.height = '100%';
            sidenav.style.zIndex = '1000';
            sidenav.style.backgroundColor = 'white';
            sidenav.style.overflowY = 'auto';
            sidenav.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            
            const style = document.createElement('style');
            style.textContent = `
                .sidenav-overlay-manual {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0,0,0,0.5);
                    z-index: 999;
                    display: none;
                }
                
                .sidenav.open {
                    transform: translateX(0) !important;
                }
                
                .sidenav-overlay-manual.visible {
                    display: block;
                }
            `;
            document.head.appendChild(style);
            
            const overlay = document.createElement('div');
            overlay.className = 'sidenav-overlay-manual';
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', () => {
                sidenav.classList.remove('open');
                overlay.classList.remove('visible');
            });
            
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Fallback sidenav trigger clicked');
                
                try {
                    if (typeof M !== 'undefined') {
                        const instance = M.Sidenav.getInstance(sidenav);
                        if (instance) {
                            console.log('Opening sidenav via Materialize');
                            instance.open();
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Error using Materialize sidenav:', err);
                }
                
                console.log('Using manual sidenav opening');
                sidenav.classList.add('open');
                overlay.classList.add('visible');
            });
            
            console.log('Fallback sidenav handler setup complete');
        }, 500);
    }

    // New method to handle submenu functionality
    _setupSubmenuHandlers() {
        window.addEventListener('load', () => {
            const submenuTriggers = document.querySelectorAll('.submenu-trigger');
            
            submenuTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    const parentLi = trigger.closest('.nested-submenu');
                    
                    if (parentLi) {
                        parentLi.classList.toggle('active');
                    }
                });
            });
        });
    }

    // Method to add back button to specific pages
    addBackButtonIfNeeded() {
        // Add immediate check on constructor call
        this._checkForBackButton();
        
        // Also check on DOM content loaded
        window.addEventListener('DOMContentLoaded', () => {
            this._checkForBackButton();
        });
        
        // Add a third check after a short delay to ensure everything is loaded
        setTimeout(() => {
            this._checkForBackButton();
        }, 500);
    }
    
    // Helper method to check and add back button
    _checkForBackButton() {
        const path = window.location.pathname.toLowerCase();
        const pageName = path.substring(path.lastIndexOf('/') + 1);
        
        // Pages that need the back button
        const pagesWithBackButton = [
            'orders.html', 
            'tables.html', 
            'history.html', 
            'setup.html',
            'credit.html',
            'menu.html'
        ];
        
        // Don't add multiple back buttons
        if (document.querySelector('.back-button')) {
            return;
        }
        
        if (pagesWithBackButton.some(page => pageName.includes(page))) {
            // Add class to body for specific styling
            document.body.classList.add('inner-page');
            const pageClass = pageName.replace('.html', '-page');
            document.body.classList.add(pageClass);
            
            // Create back button
            const backButton = document.createElement('a');
            backButton.className = 'back-button';
            backButton.innerHTML = '<i class="material-icons">arrow_back</i>';
            backButton.setAttribute('title', 'Go Back');
            backButton.style.zIndex = '1000'; // Ensure it's above other elements
            
            // Set back functionality
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = path.includes('/pages/') ? '../index.html' : 'index.html';
                }
            });
            
            // Add to DOM
            document.body.appendChild(backButton);
            
            // Add animation
            backButton.style.opacity = '0';
            backButton.style.transform = 'scale(0.8)';
            setTimeout(() => {
                backButton.style.transition = 'all 0.3s ease';
                backButton.style.opacity = '1';
                backButton.style.transform = 'scale(1)';
            }, 200);
            
            // Fix top spacing for specific pages
            const style = document.createElement('style');
            style.textContent = `
                body {
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                .container:first-of-type {
                    margin-top: 10px !important;
                    padding-top: 10px !important;
                }
                
                .navbar-fixed {
                    margin-bottom: 0 !important;
                }
                
                /* Make it more visible */
                .back-button {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background-color: #00897b;
                    color: white;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Define the custom element
customElements.define('app-header', AppHeader);