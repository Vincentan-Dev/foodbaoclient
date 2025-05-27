/**
 * Early Session Verification - Ultra-aggressive check
 * 
 * This script must be included inline in the <head> of protected pages
 * BEFORE any other scripts or resources are loaded.
 * 
 * It performs the earliest possible session verification to prevent unauthorized
 * access through back navigation.
 */

// Execute immediately as script is parsed
(function() {
    // Verify session before any other resources load
    if (!verifySessionEarly()) {
        // If session verification fails, prevent page from loading further
        preventPageRender();
        redirectToLogin();
    }
    
    /**
     * Ultra-early session verification
     */
    function verifySessionEarly() {
        try {
            const sessionKey = localStorage.getItem('session_key');
            const authToken = localStorage.getItem('auth_token');
            
            // Simple check - must have both session key and auth token
            return !!(sessionKey && authToken);
        } catch (e) {
            // If any error occurs during check, fail closed (secure default)
            console.error('Early session verification error:', e);
            return false;
        }
    }
    
    /**
     * Block page rendering completely
     */
    function preventPageRender() {
        // Hide everything
        document.documentElement.style.display = 'none';
        
        // Attempt to stop further script execution
        if (window.stop) {
            window.stop();
        }
    }
    
    /**
     * Redirect to login with cache-busting
     */
    function redirectToLogin() {
        const timestamp = new Date().getTime();
        window.location.replace('/login.html?redirect=blocked&ts=' + timestamp);
    }
})();