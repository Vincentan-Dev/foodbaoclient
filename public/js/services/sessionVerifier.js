/**
 * Session Verification Utility
 * 
 * This script provides robust session verification and prevents back-button
 * access to authenticated pages after logout. It should be included at the
 * top of all protected pages.
 */

// Self-executing function to verify session immediately
(function() {
    // Check for URL authentication parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    
    // If URL username is provided, skip session verification and let URL auth handle it
    if (urlUsername) {
        console.log('URL authentication detected, skipping session verification');
        return;
    }
    
    // Wait for DOM to be ready before running verification
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', verifySession);
    } else {
        verifySession();
    }
    
    // Also verify session when the page becomes visible again
    // This helps prevent back-button access after logout
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            verifySession();
        }
    });
    
    // Verify session validity
    function verifySession() {
        console.log('Verifying session...');
        
        // Get authentication data
        const authToken = localStorage.getItem('auth_token');
        const username = localStorage.getItem('username');
        const sessionKey = localStorage.getItem('session_key');
        const sessionCreated = localStorage.getItem('session_created');
        const userRole = localStorage.getItem('user_role');
        
        // Function to handle invalid session
        function handleInvalidSession(reason) {
            console.warn('Session invalid:', reason);
            
            // Clear all authentication data
            const authItems = [
                'auth_token', 'username', 'user_role', 'client_id',
                'session_key', 'session_created', 'user_data'
            ];
            
            authItems.forEach(item => {
                localStorage.removeItem(item);
            });
            
            // Wait for document.body to be available before manipulating it
            function clearPageAndRedirect() {
                if (document.body) {
                    // Clear the page content to prevent momentary display of protected content
                    document.body.innerHTML = '';
                    document.body.style.opacity = '0';
                }
                
                // Add cache control meta tags to prevent caching
                if (document.head) {
                    const meta = document.createElement('meta');
                    meta.httpEquiv = 'Cache-Control';
                    meta.content = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
                    document.head.appendChild(meta);
                }
                
                // Redirect with reason parameter and cache-busting query param
                const timestamp = new Date().getTime();
                window.location.replace(`/login.html?reason=${reason}&t=${timestamp}`);
            }
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', clearPageAndRedirect);
            } else {
                clearPageAndRedirect();
            }
            
            return false;
        }
        
        // Check for missing authentication data
        if (!authToken || !username) {
            return handleInvalidSession('missing');
        }
        
        // Check for missing session key (required for back-button protection)
        if (!sessionKey || !sessionCreated) {
            return handleInvalidSession('invalid');
        }
        
        // Check session age (optional, set to 12 hours)
        const sessionMaxAge = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
        const sessionAge = Date.now() - parseInt(sessionCreated, 10);
        if (sessionAge > sessionMaxAge) {
            return handleInvalidSession('expired');
        }
        
        // Skip credit expiry check for ADMIN and AGENT roles
        if (userRole === 'ADMIN' || userRole === 'AGENT') {
            return true;
        }
        
        // Check if credit is expired for CLIENT role
        // Only perform this check on pages that aren't already credit-related
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop();
        const isCreditPage = currentPage === 'credit.html' || 
                           currentPage === 'credit-ledgers.html' || 
                           currentPage === 'credit-topup.html';
                           
        // Skip this check if we're already on a credit page
        if (userRole === 'CLIENT' && !isCreditPage) {
            checkCreditExpiry(username);
        }
        
        // Check token validity with the server (optional, can be uncommented)
        /*
        fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return handleInvalidSession('server');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error verifying token:', error);
            // Don't invalidate session for network errors
        });
        */
        
        return true;
    }
    
    // Check if client credit has expired
    function checkCreditExpiry(username) {
        fetch(`/api/clients/by-username/${username}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    const client = data.data;
                    
                    // Check if EXP_DATE exists and is in the past
                    if (client.expDate) {
                        const expDate = new Date(client.expDate);
                        const today = new Date();
                        
                        // Reset time portions to compare just the dates
                        today.setHours(0, 0, 0, 0);
                        expDate.setHours(0, 0, 0, 0);
                        
                        if (expDate < today) {
                            console.warn('Credit expired. Redirecting to credit page');
                            
                            // Store a flag in localStorage to show an expired notice
                            localStorage.setItem('credit_expired', 'true');
                            
                            // Redirect to credit page
                            window.location.href = '/pages/credit.html?expired=true';
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error checking credit expiry:', error);
                // Don't invalidate session for network errors
            });
    }
})();