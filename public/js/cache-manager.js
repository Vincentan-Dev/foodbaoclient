/**
 * FoodBao Cache Manager
 * Handles browser cache operations and service worker integration
 */

(function() {
    'use strict';
    
    // Cache expiry times (in milliseconds)
    const CACHE_CONFIG = {
        menuItems: 30 * 60 * 1000, // 30 minutes
        profile: 60 * 60 * 1000,   // 1 hour
        settings: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    // Register the service worker if available
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function(registration) {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(function(error) {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
    
    /**
     * Cache Manager API
     */
    window.CacheManager = {
        /**
         * Store data in cache with expiry
         * @param {string} key - Cache key
         * @param {*} data - Data to cache
         * @param {number} expiryTime - Expiry time in ms
         * @returns {boolean} Success
         */
        store: function(key, data, expiryTime) {
            if (!key) return false;
            
            try {
                const cacheItem = {
                    data: data,
                    expiry: Date.now() + (expiryTime || 3600000), // Default 1hr
                    timestamp: Date.now()
                };
                
                localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
                return true;
            } catch (error) {
                console.warn('Failed to store in cache:', error);
                return false;
            }
        },
        
        /**
         * Retrieve data from cache
         * @param {string} key - Cache key
         * @returns {*} Cached data or null if expired/missing
         */
        retrieve: function(key) {
            if (!key) return null;
            
            try {
                const cacheItemRaw = localStorage.getItem(`cache_${key}`);
                if (!cacheItemRaw) return null;
                
                const cacheItem = JSON.parse(cacheItemRaw);
                
                // Check expiry
                if (cacheItem.expiry < Date.now()) {
                    this.remove(key);
                    return null;
                }
                
                return cacheItem.data;
            } catch (error) {
                console.warn('Failed to retrieve from cache:', error);
                return null;
            }
        },
        
        /**
         * Remove item from cache
         * @param {string} key - Cache key
         */
        remove: function(key) {
            if (!key) return;
            localStorage.removeItem(`cache_${key}`);
        },
        
        /**
         * Clear all cached items
         * @param {string} prefix - Optional prefix filter
         */
        clearAll: function(prefix) {
            const cachePrefix = prefix ? `cache_${prefix}` : 'cache_';
            
            // Get all cache keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(cachePrefix)) {
                    localStorage.removeItem(key);
                }
            });
        }
    };
    
    // Initialize and perform cleanup of expired items
    function cleanExpiredCache() {
        const now = Date.now();
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                try {
                    const cacheItem = JSON.parse(localStorage.getItem(key));
                    if (cacheItem.expiry < now) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Invalid cache item, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    }
    
    // Clean expired cache items on load
    cleanExpiredCache();
    
    console.log('Cache manager initialized');
})();
