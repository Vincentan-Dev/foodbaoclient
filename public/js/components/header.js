class AppHeader extends HTMLElement {
    connectedCallback() {
        // Set initial HTML structure first
        this.innerHTML = `
            <header>
                <div class="navbar-fixed">
                    <nav class="teal" id="main-nav">
                        <div class="nav-wrapper container-flush">
                            <!-- Logo with improved sidenav trigger -->
                            <a href="#!" class="sidenav-trigger show-on-large" data-target="mobile-nav" id="nav-menu-trigger">
                                <img src="img/FBLogo.jpg" alt="FoodBao" style="height: 40px; width: 40px; margin: 8px 0; border-radius: 50%; vertical-align: middle; object-fit: cover;">
                            </a>
                            
                            <!-- Username and Role with improved center-right alignment -->
                            <div class="user-display">
                                <div class="user-text-container">
                                    <span id="nav-username" class="username truncate">User</span>
                                    <span class="role-separator">-</span>
                                    <span id="nav-userrole" class="userrole truncate">Role</span>
                                </div>
                            </div>
                            
                            <!-- Logout button with better spacing -->
                            <ul class="right" style="margin-right: 16px;">
                                <li><a href="#!" id="topnav-logout-btn" class="tooltipped logout-button" data-position="bottom" data-tooltip="Logout">
                                    <i class="material-icons">exit_to_app</i>
                                </a></li>
                            </ul>
                        </div>
                    </nav>
                </div>
                
                <!-- Mobile sidenav structure - now with dynamic background -->
                <ul id="mobile-nav" class="sidenav narrower-sidenav">
                    <li>
                        <div class="user-view center-align">
                            <div class="background teal darken-1" id="sidenav-background">
                                <!-- Dynamic background will be applied here -->
                            </div>
                            <a href="index.html" class="center-align">
                                <img class="circle" id="user-avatar" src="img/FBLogo.jpg" alt="User">
                            </a>
                            <a href="index.html" class="center-align">
                                <span class="white-text name" id="sidenav-username">User</span>
                                <span class="white-text email" id="sidenav-userrole"></span>
                            </a>
                        </div>
                    </li>
                    
                    <li class="menu-transition-gradient"></li>
                    
                    <li><a href="pages/profile.html"><i class="material-icons left">account_circle</i>My Profile</a></li>
                    <li><a href="pages/clientsrch.html" id="client-menu-link"><i class="material-icons left">people</i>Client</a></li>
                    <li><a href="pages/credit-ledgers.html"><i class="material-icons left">credit_card</i>Credit Ledgers</a></li>
                    <li><a href="pages/menu-items.html"><i class="material-icons left">restaurant</i>Menu Items</a></li>
                    <li><a href="pages/menu-categories.html"><i class="material-icons left">restaurant_menu</i>Menu Categories</a></li>
                    <li><a href="pages/items-variations.html"><i class="material-icons left">tune</i>Items Variations</a></li>
                    <li><a href="pages/cloudinary.html"><i class="material-icons left">cloud_upload</i>Cloudinary</a></li>                  
                    <li><div class="divider"></div></li>                  
                    <!-- Logout option -->
                    <li><a href="#" id="sidenav-logout-btn"><i class="material-icons left">exit_to_app</i>Logout</a></li>
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
                
                /* Make sure logout button is visible */
                .logout-button {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    height: 64px !important;
                    width: 48px !important;
                }
                
                .logout-button i.material-icons {
                    font-size: 24px !important;
                }
                
                /* Improved style for username and role display */
                .user-display {
                    display: inline-flex;
                    align-items: center;
                    height: 64px;
                    margin-left: 70px;
                    white-space: nowrap;
                    max-width: calc(100% - 170px); /* Increased space for logout button */
                    overflow: hidden;
                    position: absolute;
                    left: 0;
                    right: 70px; /* Leave space for logout button */
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
                    
                    .logout-button {
                        height: 56px !important;
                    }
                    
                    .user-display {
                        height: 56px;
                        margin-left: 60px;
                        max-width: calc(100% - 150px);
                        right: 60px;
                    }
                    
                    .user-text-container {
                        font-size: clamp(11px, 2vw, 14px);
                        padding-right: 10px;
                    }
                    
                    .userrole {
                        max-width: 80px;
                    }
                    
                    /* Ensure logout icon is visible on mobile */
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
                        right: 50px;
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
                
                /* Mobile-specific styles */
                @media only screen and (max-width: 600px) {
                    nav .sidenav-trigger {
                        height: 56px !important;
                    }
                    
                    .logout-button {
                        height: 56px !important;
                    }
                    
                    .user-display {
                        height: 56px;
                        font-size: 12px;
                        margin-left: 60px;
                    }
                    
                    .userrole {
                        font-size: 10px;
                    }
                    
                    /* Ensure logout icon is visible on mobile */
                    .right {
                        position: absolute !important;
                        right: 0 !important;
                        top: 0 !important;
                    }
                }
                
                /* Narrower sidenav */
                .narrower-sidenav {
                    width: 250px !important; /* Narrower than default 300px */
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
                
                /* Improved gradient overlay for better text readability */
                .sidenav .user-view .background:after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 80%;
                    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.9) 100%);
                    z-index: 1;
                }
                
                /* Menu transition element for smooth fade between image and menu */
                .sidenav .menu-transition-gradient {
                    height: 10px;
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(255,255,255,0) 100%);
                    position: relative;
                    z-index: 2;
                }
                
                /* Make sure content is above the gradient */
                .sidenav .user-view a {
                    position: relative;
                    z-index: 2;
                }
                
                .sidenav .user-view .circle {
                    height: 70px; /* Slightly smaller */
                    width: 70px;  /* Slightly smaller */
                    margin: 0 auto 12px;
                    display: block;
                    object-fit: cover;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    transition: transform 0.3s ease;
                }
                
                .sidenav .user-view .circle:hover {
                    transform: scale(1.05);
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
                
                /* Dynamic header background */
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
                    background: rgba(0, 150, 136, 0.85); /* Teal with opacity */
                    z-index: 0;
                }
                
                nav.with-banner .nav-wrapper {
                    position: relative;
                    z-index: 1;
                }
                
                /* Mobile styles */
                @media only screen and (max-width: 600px) {
                    .user-display {
                        height: 56px;
                        font-size: 12px;
                        margin-left: 40px; /* Reduced from 50px */
                    }
                    
                    .userrole {
                        font-size: 10px;
                    }
                }
                
                /* Extra small screens */
                @media only screen and (max-width: 320px) {
                    .user-display {
                        max-width: 140px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .narrower-sidenav {
                        width: 230px !important; /* Even narrower for very small screens */
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
        
        // Setup event listeners
        this._setupEventListeners();
        this.setupLogoClickHandler();
        this._setupFallbackSidenav();
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
                const sidenavBackground = document.getElementById('sidenav-background');
                if (sidenavBackground) {
                    sidenavBackground.style.backgroundImage = `url('${backgroundImgUrl}')`;
                    sidenavBackground.classList.remove('teal', 'darken-1');
                    
                    // Add a subtle animation effect
                    sidenavBackground.style.animation = 'fadeInBackground 1.2s ease-out forwards';
                    
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
                    
                    console.log('Applied background image to sidenav');
                }
                
                // Apply complementary styling to the menu transition
                const menuTransition = document.querySelector('.menu-transition-gradient');
                if (menuTransition) {
                    // Adjust the transition gradient to match the image's dominant color
                    // This is a simple implementation - for more advanced color extraction
                    // you would need an image analysis library
                    menuTransition.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(255,255,255,0) 100%)';
                }
            }
            
            // Apply banner image to top nav if available
            const bannerImgUrl = client.BANNER_IMGURL;
            if (bannerImgUrl && this.isValidImageUrl(bannerImgUrl)) {
                const mainNav = document.getElementById('main-nav');
                if (mainNav) {
                    mainNav.style.setProperty('--banner-image', `url('${bannerImgUrl}')`);
                    mainNav.classList.add('with-banner');
                    console.log('Applied banner image to top nav');
                }
            }
            
            // If user has a profile image, use it instead of default logo
            const profileImgUrl = client.PROFILE_IMGURL;
            if (profileImgUrl && this.isValidImageUrl(profileImgUrl)) {
                const userAvatar = document.getElementById('user-avatar');
                if (userAvatar) {
                    userAvatar.src = profileImgUrl;
                    console.log('Applied profile image to avatar');
                    
                    // Add a nice reveal animation to the avatar
                    userAvatar.style.animation = 'avatarReveal 0.8s ease-out forwards';
                    
                    // Add a style for the animation if it doesn't exist
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
        const username = localStorage.getItem('username') || 'User';
        const userRole = localStorage.getItem('user_role') || 'Guest';
        
        const usernameElements = [
            document.getElementById('nav-username'),
            document.getElementById('sidenav-username')
        ];
        
        usernameElements.forEach(element => {
            if (element) element.textContent = username;
        });
        
        const userRoleElements = [
            document.getElementById('nav-userrole'),
            document.getElementById('sidenav-userrole')
        ];
        
        userRoleElements.forEach(element => {
            if (element) element.textContent = userRole;
        });
        
        if (!localStorage.getItem('user_role') && typeof authService !== 'undefined') {
            authService.getUserDetails().then(() => {
                const fetchedRole = localStorage.getItem('user_role') || 'Guest';
                userRoleElements.forEach(element => {
                    if (element) element.textContent = fetchedRole;
                });
            });
        }
    }
    
    secureLogout() {
        console.log('Performing secure logout');
        
        try {
            const keysToRemove = [
                'auth_token', 
                'username', 
                'user_role',
                'user_id',
                'user_email',
                'authenticated',
                'last_login'
            ];
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            sessionStorage.clear();
            
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            }
            
            if (typeof authService !== 'undefined') {
                authService.logout().then(() => {
                    this.redirectToLogin();
                }).catch(error => {
                    console.error('Error during auth service logout:', error);
                    this.redirectToLogin();
                });
            } else {
                this.redirectToLogin();
            }
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
}

// Define the custom element
customElements.define('app-header', AppHeader);