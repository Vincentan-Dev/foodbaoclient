/**
 * Advanced Session Verification Utility
 * Prevents unauthorized access including via browser back button
 */

(function() {
    // Run immediately on script load
    verifySession();
    
    // Set up event listeners for navigation and visibility changes
    window.addEventListener('pageshow', function(event) {
        // This catches bfcache navigation (back/forward) in browsers
        // The persisted property is true if the page is loaded from the bfcache
        if (event.persisted) {
            console.log('Page loaded from back/forward cache (bfcache)');
            verifySession();
        }
    });
    
    // Listen for visibility changes (tab switching, bringing window to front)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            console.log('Page visibility changed to visible');
            verifySession();
        }
    });
    
    // History state changes (pushState/replaceState)
    window.addEventListener('popstate', function() {
        console.log('Navigation state changed');
        verifySession();
    });
    
    // Additional scroll event listener for aggressive checking on mobile devices
    let lastScrollTime = Date.now();
    window.addEventListener('scroll', function() {
        // Throttle checks to avoid performance issues
        if (Date.now() - lastScrollTime > 2000) {
            lastScrollTime = Date.now();
            verifySession();
        }
    });
    
    /**
     * Verify session is valid
     */
    function verifySession() {
        try {
            // Check for authentication tokens
            const sessionKey = localStorage.getItem('session_key');
            const authToken = localStorage.getItem('auth_token');
            
            // If either is missing, session is invalid
            if (!sessionKey || !authToken) {
                console.log('Authentication check failed, redirecting to login');
                // Hide page content immediately to prevent flash of protected content
                document.documentElement.style.display = 'none';
                
                // Redirect with cache busting parameter
                window.location.replace('/login.html?expired=true&nocache=' + new Date().getTime());
                return false;
            }
            
            // Additional verification logic can be added here
            // e.g., token expiration check, token validity check
            
            return true;
        } catch (e) {
            console.error('Error in session verification:', e);
            // On error, fail safe by redirecting to login
            document.documentElement.style.display = 'none';
            window.location.replace('/login.html?error=true&nocache=' + new Date().getTime());
            return false;
        }
    }
})();