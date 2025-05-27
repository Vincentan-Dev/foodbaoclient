/**
 * Session management utility to handle authentication sessions and prevent unauthorized access
 */
class SessionManager {
    constructor() {
        this.sessionKey = 'session_key';
        this.sessionCreatedKey = 'session_created';
        this.maxSessionAge = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    }

    /**
     * Initialize the session validation on page load
     * Call this function at the start of every protected page
     * @param {Object} options - Configuration options
     * @param {boolean} options.redirectToLogin - Whether to redirect to login page if session is invalid
     * @param {Function} options.onSessionInvalid - Custom callback when session is invalid
     * @param {string} options.loginPage - Login page URL to redirect to
     */
    validateSession(options = {}) {
        const defaultOptions = {
            redirectToLogin: true,
            onSessionInvalid: null,
            loginPage: '/login.html'
        };

        const opts = {...defaultOptions, ...options};
        const sessionKey = localStorage.getItem(this.sessionKey);
        const sessionCreated = localStorage.getItem(this.sessionCreatedKey);
        const currentTime = new Date().getTime();

        // Handle page visibility change (detects back button or tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Re-validate session when page becomes visible again
                this._checkSession(opts);
            }
        });

        // Handle history navigation (back/forward buttons)
        window.addEventListener('popstate', () => {
            this._checkSession(opts);
        });

        // Initial session check
        return this._checkSession(opts);
    }

    /**
     * Internal method to check session validity
     * @private
     */
    _checkSession(options) {
        const sessionKey = localStorage.getItem(this.sessionKey);
        const sessionCreated = localStorage.getItem(this.sessionCreatedKey);
        const currentTime = new Date().getTime();
        
        // Check if session exists
        if (!sessionKey || !sessionCreated) {
            console.warn('Session not found. Authentication required.');
            this._handleInvalidSession(options);
            return false;
        }
        
        // Check if session has expired
        if (currentTime - parseInt(sessionCreated) > this.maxSessionAge) {
            console.warn('Session expired. Re-authentication required.');
            this._handleInvalidSession(options);
            return false;
        }
        
        return true;
    }

    /**
     * Handle invalid session based on options
     * @private
     */
    _handleInvalidSession(options) {
        // Clear any existing session data
        this.clearSession();
        
        // Execute custom handler if provided
        if (typeof options.onSessionInvalid === 'function') {
            options.onSessionInvalid();
            return;
        }
        
        // Redirect to login page if enabled
        if (options.redirectToLogin) {
            console.log('Redirecting to login page due to invalid session');
            window.location.href = options.loginPage;
        }
    }

    /**
     * Generate a new session key and store it
     * @returns {string} The generated session key
     */
    createSession(username) {
        const timestamp = new Date().getTime();
        const randomStr = Math.random().toString(36).substring(2, 15);
        let sessionHash;
        
        // Use crypto if available for better security
        if (window.crypto && window.crypto.subtle && window.crypto.getRandomValues) {
            // Use a more secure random value
            const array = new Uint32Array(4);
            window.crypto.getRandomValues(array);
            const secureRandom = Array.from(array).join('-');
            sessionHash = this._hashString(`${username || 'user'}-${timestamp}-${secureRandom}`);
        } else {
            // Fallback to less secure but still functional
            sessionHash = this._hashString(`${username || 'user'}-${timestamp}-${randomStr}`);
        }
        
        // Store session data
        localStorage.setItem(this.sessionKey, sessionHash);
        localStorage.setItem(this.sessionCreatedKey, timestamp);
        
        return sessionHash;
    }

    /**
     * Simple hash function for strings when CryptoJS is not available
     * @private
     */
    _hashString(str) {
        // If CryptoJS is available, use it
        if (window.CryptoJS && window.CryptoJS.SHA256) {
            return window.CryptoJS.SHA256(str).toString();
        }
        
        // Simple fallback hash function
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Clear the current session
     */
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.sessionCreatedKey);
    }

    /**
     * Logout the user by clearing session and redirecting to login page
     * @param {string} redirectUrl - URL to redirect to after logout
     */
    logout(redirectUrl = '/login.html') {
        this.clearSession();
        
        // Also clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_role');
        localStorage.removeItem('client_id');
        
        // Redirect to login
        window.location.href = redirectUrl;
    }
}

// Create singleton instance
const sessionManager = new SessionManager();
export default sessionManager;