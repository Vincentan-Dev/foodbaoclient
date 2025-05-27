// FoodBao Global Ultra-Compact UI Loader
// This script should be included in the <head> section of all HTML files
// to automatically apply ultra-compact styling across the entire application

(function() {    // Function to load CSS with path detection
    function loadCompactCSS() {
        // Skip if already loaded
        if (document.querySelector('link[href*="compact-ui-advanced.css"]')) {
            return;
        }
        
        // Determine base path
        let basePath = '';
        if (window.location.pathname.includes('/pages/')) {
            basePath = '../';
        }
        
        // Create link for CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = basePath + 'css/compact-ui-advanced.css';
        document.head.appendChild(cssLink);
        
        // Add modal standardizer CSS
        const modalCssLink = document.createElement('link');
        modalCssLink.rel = 'stylesheet';
        modalCssLink.href = basePath + 'css/modal-standardizer.css';
        document.head.appendChild(modalCssLink);
        
        // Add app-wide class for targeting
        document.documentElement.classList.add('ultra-compact-mode');
    }
    
    // Function to load JS script
    function loadCompactScript() {
        // Skip if already loaded
        if (window.ultraCompactLoaded) {
            return;
        }
        
        // Determine base path
        let basePath = '';
        if (window.location.pathname.includes('/pages/')) {
            basePath = '../';
        }
        
        // Create script element for ultra-compact-ui.js
        const script = document.createElement('script');
        script.src = basePath + 'js/ultra-compact-ui.js';
        script.defer = true;
        script.onload = function() {
            window.ultraCompactLoaded = true;
        };
        document.head.appendChild(script);
        
        // Create script element for modal-standardizer.js
        const modalScript = document.createElement('script');
        modalScript.src = basePath + 'js/modal-standardizer.js';
        modalScript.defer = true;
        document.head.appendChild(modalScript);
    }
    
    // Load CSS immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCompactCSS);
    } else {
        loadCompactCSS();
    }
    
    // Load JS script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCompactScript);
    } else {
        loadCompactScript();
    }
      // Also update the Header component if it exists
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const appHeader = document.querySelector('app-header');
            if (appHeader) {
                // Apply compact styling to header
                appHeader.style.height = '36px';
                
                // Also update the header CSS custom property
                document.documentElement.style.setProperty('--header-height', '36px');
            }
              // Apply compact styling to all modals globally
            function compactifyModals() {
                // Wait for Materialize to initialize modals
                setTimeout(() => {
                    // Get all modals in the document
                    const modals = document.querySelectorAll('.modal');
                    
                    modals.forEach(modal => {
                        // Skip if already compactified
                        if (modal.classList.contains('compactified')) return;
                        
                        // Apply compact styling
                        modal.classList.add('compactified');
                        
                        // Standard 95% frame size for ALL modals
                        modal.style.width = '95%';
                        modal.style.maxWidth = '95%';
                        modal.style.height = '95%';
                        modal.style.maxHeight = '95%';
                        modal.style.top = '2.5%';
                        modal.style.borderRadius = 'var(--border-radius-md)';
                        
                        // Adjust modal content spacing
                        const modalContent = modal.querySelector('.modal-content');
                        if (modalContent) {
                            modalContent.style.padding = 'var(--spacing-sm)';
                            modalContent.style.maxHeight = 'calc(100% - 56px)';
                            modalContent.style.overflowY = 'auto';
                        }
                        
                        // Adjust modal footer spacing
                        const modalFooter = modal.querySelector('.modal-footer');
                        if (modalFooter) {
                            modalFooter.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
                            modalFooter.style.height = 'auto';
                            modalFooter.style.minHeight = '36px';
                        }
                        
                        // Reduce button sizes in modal footers
                        const footerButtons = modalFooter?.querySelectorAll('button, .btn, .btn-flat');
                        if (footerButtons) {
                            footerButtons.forEach(btn => {
                                btn.style.height = '32px';
                                btn.style.lineHeight = '32px';
                                btn.style.padding = '0 var(--spacing-md)';
                            });
                        }
                    });
                }, 500);
            }
            
            // Call once at load time
            compactifyModals();
            
            // Also observe for new modals being added to the DOM
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length) {
                        compactifyModals();
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
})();
