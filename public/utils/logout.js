/**
 * Secure Logout Utility
 * 
 * This module provides enhanced logout functionality that:
 * 1. Properly clears all authentication data
 * 2. Prevents back-button access to authenticated pages
 * 3. Redirects to login with proper reason parameter
 */

const logout = {
    /**
     * Perform a secure logout operation
     * 
     * @param {boolean} redirect - Whether to redirect to login page after logout
     * @param {string} reason - Reason for logout (user, expired, security)
     * @returns {Promise<boolean>} Success status
     */
    async performLogout(redirect = true, reason = 'user') {
        console.log('Performing secure logout. Reason:', reason);
        
        try {
            // Apply fade-out transition to entire page
            document.body.classList.add('fadeOut');
            
            // 1. Clear all authentication data from localStorage
            const authItems = [
                'auth_token', 'username', 'user_role', 'client_id',
                'session_key', 'session_created', 'session_timestamp',
                'user_data', 'businessName'
            ];
            
            authItems.forEach(item => {
                localStorage.removeItem(item);
                sessionStorage.removeItem(item);
            });
            
            // 2. Clear additional data items
            const additionalItems = [
                'clientId', 'clientType', 'offlineMode', 'checking_profile'
            ];
            
            additionalItems.forEach(item => {
                localStorage.removeItem(item);
                sessionStorage.removeItem(item);
            });
            
            // 3. Invalidate HTTP-only cookies (if any) by calling logout API
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
            } catch (error) {
                // API error is not critical, we still want to continue logout process
                console.warn('Error during server logout:', error);
            }
            
            // 4. Add anti-caching headers using meta tags
            this.addNoCacheHeaders();
            
            // 5. Clear page content to prevent momentary display after back button
            if (redirect) {
                // Short delay to allow fade effect
                setTimeout(() => {
                    // Clear content before redirect to prevent back button showing content briefly
                    document.body.innerHTML = '';
                    
                    // 6. Replace current history entry with login page to prevent back navigation
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, null, '/login.html');
                    }
                    
                    // 7. Redirect with cache-busting timestamp
                    const timestamp = Date.now();
                    window.location.replace(`/login.html?reason=${reason}&t=${timestamp}`);
                }, 300); // Short delay for fade effect
            }
            
            return true;
        } catch (error) {
            console.error('Error during logout:', error);
            
            // Even if there's an error, try to redirect
            if (redirect) {
                window.location.replace('/login.html?error=logout_failed');
            }
            
            return false;
        }
    },
    
    /**
     * Add anti-caching headers using meta tags
     */
    addNoCacheHeaders() {
        // Add cache control meta tags
        const metaTags = [
            { httpEquiv: 'Cache-Control', content: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
            { httpEquiv: 'Pragma', content: 'no-cache' },
            { httpEquiv: 'Expires', content: '0' }
        ];
        
        metaTags.forEach(meta => {
            let metaTag = document.createElement('meta');
            metaTag.httpEquiv = meta.httpEquiv;
            metaTag.content = meta.content;
            document.head.appendChild(metaTag);
        });
    }
};

export default logout;