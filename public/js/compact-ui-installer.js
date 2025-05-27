/**
 * FoodBao Auto-Installer for Ultra-Compact UI
 * This script can be included via a bookmarklet or developer console to instantly apply 
 * ultra-compact UI to any page in the FoodBao application.
 * 
 * Bookmarklet usage:
 * javascript:(function(){var s=document.createElement('script');s.src='https://YOUR_DOMAIN/js/compact-ui-installer.js';document.head.appendChild(s);})();
 */

(function() {
    console.log('🚀 Ultra-Compact UI Auto-Installer running...');
    
    // First check if we're on a FoodBao page
    if (!isFoodBaoPage()) {
        console.warn('⚠️ This doesn\'t appear to be a FoodBao application page');
        return;
    }
    
    // Check if already installed
    if (document.querySelector('#ultra-compact-ui-installed')) {
        console.log('✓ Ultra-Compact UI is already installed on this page');
        return;
    }
    
    // Install marker
    const marker = document.createElement('meta');
    marker.id = 'ultra-compact-ui-installed';
    marker.name = 'ultra-compact-ui-version';
    marker.content = '1.0.0';
    document.head.appendChild(marker);
    
    // 1. Inject the CSS
    injectCompactCSS();
    
    // 2. Inject the runtime script
    injectCompactScript();
    
    // 3. Apply immediate DOM adjustments
    applyCompactSpacingAdjustments();
    
    // 4. Inject modal standardizer
    injectModalStandardizer();
    
    console.log('✓ Ultra-Compact UI successfully installed!');
    
    // Helper function to check if we're on a FoodBao page
    function isFoodBaoPage() {
        // Check page title
        const title = document.title.toLowerCase();
        if (title.includes('foodbao') || title.includes('food order')) {
            return true;
        }
        
        // Check for FoodBao-specific elements
        if (document.querySelector('app-header') || 
            document.querySelector('.app-header') ||
            document.querySelector('[data-foodbao]')) {
            return true;
        }
        
        // Check if the page contains FoodBao-specific script URLs
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            if (script.src && (
                script.src.includes('foodbao') || 
                script.src.includes('cache-manager.js') ||
                script.src.includes('compact-ui')
            )) {
                return true;
            }
        }
        
        return false;
    }
    
    // Helper function to inject our CSS
    function injectCompactCSS() {
        const cssUrl = getBasePath() + 'css/compact-ui-advanced.css';
        
        // Check if already loaded
        if (document.querySelector(`link[href$="compact-ui-advanced.css"]`)) {
            console.log('✓ Advanced compact CSS already loaded');
            return;
        }
        
        // Create and append the stylesheet link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
        
        console.log('✓ Injected compact-ui-advanced.css');
    }
    
    // Helper function to inject our script
    function injectCompactScript() {
        const scriptUrl = getBasePath() + 'js/ultra-compact-ui.js';
        
        // Check if already loaded
        if (window.ultraCompactLoaded || 
            document.querySelector(`script[src$="ultra-compact-ui.js"]`)) {
            console.log('✓ Ultra-compact JS already loaded');
            return;
        }
        
        // Create and append the script tag
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.defer = true;
        document.head.appendChild(script);
        
        console.log('✓ Injected ultra-compact-ui.js');
    }
    
    // Helper function to determine base path
    function getBasePath() {
        // Check if we're in a subdirectory and adjust path accordingly
        const path = window.location.pathname;
        
        if (path.includes('/pages/')) {
            return '../';
        }
        
        return './';
    }
    
    // Apply immediate DOM adjustments
    function applyCompactSpacingAdjustments() {
        console.log('📏 Applying immediate compact spacing adjustments...');
        
        // Add compact mode class to body and html
        document.body.classList.add('compact-ui-mode');
        document.documentElement.classList.add('ultra-compact-mode');
        
        // Reduce header height
        document.documentElement.style.setProperty('--header-height', '36px');
        
        // Reduce container padding
        document.querySelectorAll('.container, .section, .row').forEach(el => {
            el.style.margin = '2px auto';
            el.style.padding = '2px';
        });
        
        // Reduce column padding
        document.querySelectorAll('.col').forEach(el => {
            el.style.padding = '1px 2px';
        });
        
        // Make cards more compact
        document.querySelectorAll('.card, .card-panel').forEach(el => {
            el.style.margin = '2px 0';
            el.style.padding = '3px';
            
            // Reduce card content padding
            const content = el.querySelector('.card-content');
            if (content) content.style.padding = '3px';
            
            // Reduce card action padding
            const action = el.querySelector('.card-action');
            if (action) action.style.padding = '2px 3px';
        });
        
        // Make buttons more compact
        document.querySelectorAll('.btn, .btn-flat').forEach(el => {
            el.style.height = '28px';
            el.style.lineHeight = '28px';
            el.style.padding = '0 6px';
        });
        
        document.querySelectorAll('.btn-small').forEach(el => {
            el.style.height = '24px';
            el.style.lineHeight = '24px';
            el.style.padding = '0 4px';
            el.style.fontSize = '0.75rem';
        });
        
        // Compact app header if present
        const appHeader = document.querySelector('app-header');
        if (appHeader) {
            appHeader.style.height = '36px';
            
            const headerElement = appHeader.querySelector('.app-header');
            if (headerElement) {
                headerElement.style.height = '36px';
                headerElement.style.minHeight = '36px';
            }
        }
        
        console.log('✓ Applied immediate compact spacing adjustments');
    }
    
    // Inject modal standardizer CSS and JS
    function injectModalStandardizer() {
        console.log('Injecting Modal Standardizer...');
        
        // Determine base path
        let basePath = detectBasePath();
        
        // Inject CSS for modal standardization
        const modalCssLink = document.createElement('link');
        modalCssLink.rel = 'stylesheet';
        modalCssLink.href = basePath + 'css/modal-standardizer.css';
        document.head.appendChild(modalCssLink);
        
        // Inject JS for modal standardization
        const modalScript = document.createElement('script');
        modalScript.src = basePath + 'js/modal-standardizer.js';
        modalScript.defer = true;
        document.head.appendChild(modalScript);
        
        // Also apply immediate standardization to any existing modals
        setTimeout(function() {
            // Apply 95% frame size to all modals
            document.querySelectorAll('.modal').forEach(modal => {
                if (!modal.dataset.standardized) {
                    modal.dataset.standardized = 'true';
                    
                    // Standard 95% frame size
                    modal.style.width = '95%';
                    modal.style.maxWidth = '95%';
                    modal.style.height = '95%';
                    modal.style.maxHeight = '95%';
                    modal.style.top = '2.5%';
                    modal.style.borderRadius = '3px';
                    modal.style.padding = '0';
                    
                    // Content adjustments
                    const content = modal.querySelector('.modal-content');
                    if (content) {
                        content.style.padding = '3px 5px';
                        content.style.maxHeight = 'calc(100% - 56px)';
                        content.style.overflowY = 'auto';
                    }
                    
                    // Footer adjustments
                    const footer = modal.querySelector('.modal-footer');
                    if (footer) {
                        footer.style.padding = '2px 5px';
                        footer.style.height = 'auto';
                        footer.style.minHeight = '36px';
                    }
                }
            });
        }, 500);
        
        console.log('✓ Modal Standardizer injected');
    }
})();
