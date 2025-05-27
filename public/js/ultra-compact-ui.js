/**
 * FoodBao Ultra-Compact UI Injector
 * This script automatically applies advanced compact UI styling to all pages in the application
 * and performs runtime DOM adjustments to further reduce spacing
 */

// Apply compact UI to all pages
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ultra-Compact UI initializing...');
    
    // First, inject the advanced compact UI CSS if not already present
    injectCompactCSS();
    
    // Apply runtime adjustments for maximum space reduction
    setTimeout(applyCompactSpacingAdjustments, 300);
    
    // Observe DOM for dynamic content and apply compact styling
    observeDynamicContent();
    
    // Initial call
    setTimeout(optimizeOrderDetailsModal, 500);
    
    // Create observer to detect when order details modal is opened
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Check for modals that may have been added or changed
                const orderModals = document.querySelectorAll('.order-details-modal');
                if (orderModals.length > 0) {
                    setTimeout(optimizeOrderDetailsModal, 100);
                }
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
});

// Inject compact CSS if not already loaded
function injectCompactCSS() {
    // Skip if we're already on a page with compact-ui-advanced.css
    if (document.querySelector('link[href*="compact-ui-advanced.css"]')) {
        console.log('Advanced compact CSS already loaded');
        return;
    }
    
    // Determine the correct path based on the current URL
    let cssPath = 'css/compact-ui-advanced.css';
    
    // If we're in a subdirectory page (e.g., /pages/), adjust the path
    if (window.location.pathname.includes('/pages/')) {
        cssPath = '../css/compact-ui-advanced.css';
    }
    
    // Create link element for compact-ui-advanced.css with the correct path
    const compactUiLink = document.createElement('link');
    compactUiLink.rel = 'stylesheet';
    compactUiLink.href = cssPath;
    
    // Append to head
    document.head.appendChild(compactUiLink);
    
    console.log('Advanced Compact UI styles loaded: ' + cssPath);
    
    // Add compact class to body for targeting
    document.body.classList.add('compact-ui-mode');
}

// Apply runtime adjustments to further reduce spacing
function applyCompactSpacingAdjustments() {
    console.log('Applying ultra-compact spacing adjustments');
    
    // Reduce spacing of containers
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
    
    // Make modals more compact
    document.querySelectorAll('.modal').forEach(el => {
        el.style.padding = '3px';
        
        // Reduce modal content padding
        const content = el.querySelector('.modal-content');
        if (content) content.style.padding = '3px';
        
        // Reduce modal footer height and padding
        const footer = el.querySelector('.modal-footer');
        if (footer) {
            footer.style.height = 'auto';
            footer.style.minHeight = 'auto';
            footer.style.padding = '2px 3px';
        }
    });
    
    // Order-specific styling
    document.querySelectorAll('.order-card, .order-item, .list-view-row').forEach(el => {
        el.style.padding = '2px 3px';
        el.style.marginBottom = '2px';
    });
    
    // Make table rows more compact
    document.querySelectorAll('tr').forEach(el => {
        el.style.height = 'auto';
        el.style.minHeight = '24px';
    });
    
    document.querySelectorAll('th, td').forEach(el => {
        el.style.padding = '2px 3px';
    });
    
    // Make lists more compact
    document.querySelectorAll('.collection .collection-item').forEach(el => {
        el.style.padding = '2px 3px';
        el.style.minHeight = 'auto';
        el.style.lineHeight = '1.2';
    });
    
    // Make inputs more compact
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="password"]').forEach(el => {
        el.style.height = '1.8rem';
        el.style.marginBottom = '1px';
    });
    
    document.querySelectorAll('.input-field').forEach(el => {
        el.style.marginTop = '3px';
        el.style.marginBottom = '3px';
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
    
    // Make tabs more compact
    document.querySelectorAll('.tabs').forEach(el => {
        el.style.height = '34px';
    });
    
    document.querySelectorAll('.tabs .tab').forEach(el => {
        el.style.lineHeight = '34px';
    });
    
    document.querySelectorAll('.tabs .tab a').forEach(el => {
        el.style.padding = '0 6px';
        el.style.fontSize = '0.8rem';
    });
    
    // Reduce padding around page sections
    document.querySelectorAll('.page-title').forEach(el => {
        el.style.margin = '2px 0';
        el.style.padding = '2px';
    });
    
    // Make order details modal more compact
    document.querySelectorAll('.order-details-modal').forEach(el => {
        // Make it slightly bigger to fit content better
        el.style.width = '98%';
        el.style.maxWidth = '98%';
        el.style.maxHeight = '98%';
        el.style.height = '98%';
        el.style.top = '1%';
    });
    
    // Reduce order item card padding
    document.querySelectorAll('.modal-item').forEach(el => {
        el.style.padding = '3px';
        el.style.marginBottom = '3px';
    });
    
    // Make order header in modal more compact
    document.querySelectorAll('.modal-header').forEach(el => {
        el.style.padding = '5px 10px';
    });
    
    // Reduce some font sizes for better space efficiency
    document.querySelectorAll('.order-time, .item-price, .item-quantity').forEach(el => {
        el.style.fontSize = '0.75rem';
    });
    
    // Reduce dashed borders to solid to save space
    document.querySelectorAll('.order-footer').forEach(el => {
        el.style.borderTop = '1px solid #eee';
    });
    
    // Make full-width containers truly full-width
    document.querySelectorAll('.container').forEach(el => {
        el.style.width = '100%';
        el.style.maxWidth = '100%';
    });
    
    console.log('Ultra-compact spacing adjustments applied');
}

// Observe dynamic content changes and apply compact styling
function observeDynamicContent() {
    // Create a MutationObserver to watch for dynamic content changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // If new nodes are added, apply compact styling to them
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Look for specific elements that may need compact styling
                const newCards = document.querySelectorAll('.card:not(.compact-adjusted), .order-card:not(.compact-adjusted)');
                if (newCards.length > 0) {
                    newCards.forEach(el => {
                        el.style.margin = '2px 0';
                        el.style.padding = '3px';
                        el.classList.add('compact-adjusted');
                    });
                }
                
                // Look for new modals
                const newModals = document.querySelectorAll('.modal:not(.compact-adjusted)');
                if (newModals.length > 0) {
                    newModals.forEach(el => {
                        el.style.padding = '3px';
                        el.classList.add('compact-adjusted');
                    });
                }
                
                // Look for new inputs
                const newInputs = document.querySelectorAll('input[type="text"]:not(.compact-adjusted), input[type="number"]:not(.compact-adjusted)');
                if (newInputs.length > 0) {
                    newInputs.forEach(el => {
                        el.style.height = '1.8rem';
                        el.style.marginBottom = '1px';
                        el.classList.add('compact-adjusted');
                    });
                }
            }
        });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Dynamic content observer initialized');
}

// Re-apply compact styling on window resize
window.addEventListener('resize', function() {
    setTimeout(applyCompactSpacingAdjustments, 300);
});

// Special function to optimize order details modal display
function optimizeOrderDetailsModal() {
    console.log('Applying ultra-compact styling to order details modal');
    
    // Find all order details modals in the document
    document.querySelectorAll('.order-details-modal').forEach(modal => {
        // Skip if already processed
        if (modal.dataset.ultraCompactProcessed === 'true') return;
        modal.dataset.ultraCompactProcessed = 'true';
        
        // Make modal take more screen space
        modal.style.width = '98%';
        modal.style.maxWidth = '98%';
        modal.style.maxHeight = '98%';
        modal.style.height = '98%';
        modal.style.top = '1% !important';
        modal.style.borderRadius = 'var(--border-radius-md, 3px)';
        
        // Optimize header
        const header = modal.querySelector('.modal-header');
        if (header) {
            header.style.padding = 'var(--spacing-xs, 2px) var(--spacing-sm, 3px)';
            header.style.height = '36px';
            header.style.minHeight = '36px';
            header.style.display = 'flex';
            header.style.alignItems = 'center';
        }
        
        // Optimize close button
        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.style.top = 'var(--spacing-xs, 2px)';
            closeBtn.style.right = 'var(--spacing-sm, 3px)';
            closeBtn.style.fontSize = '18px';
        }
        
        // Optimize content area
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.padding = '0';
            content.style.maxHeight = 'calc(100% - 36px)'; // Account for reduced header height
        }
        
        // Optimize order body
        const orderBody = modal.querySelector('.order-body');
        if (orderBody) {
            orderBody.style.padding = 'var(--spacing-sm, 3px)';
        }
        
        // Optimize meta information
        const metaInfo = modal.querySelector('.modal-order-meta');
        if (metaInfo) {
            metaInfo.style.display = 'flex';
            metaInfo.style.flexWrap = 'wrap';
            metaInfo.style.margin = '0 calc(-1 * var(--spacing-xs, 2px))';
        }
        
        // Optimize meta items
        modal.querySelectorAll('.modal-order-meta-item').forEach(item => {
            item.style.flex = '1 1 120px';
            item.style.padding = 'var(--spacing-xs, 2px)';
            item.style.minWidth = '120px';
        });
        
        // Optimize item rows
        modal.querySelectorAll('.kitchen-item-row').forEach(row => {
            row.style.padding = 'var(--spacing-xs, 2px) 0';
            row.style.margin = 'var(--spacing-xxs, 1px) 0';
            row.style.borderBottom = '1px dashed #eee';
        });
        
        // Optimize variation options
        modal.querySelectorAll('.kitchen-variation-option').forEach(option => {
            option.style.fontSize = 'var(--font-size-xs, 0.7rem)';
            option.style.padding = '0 var(--spacing-xs, 2px)';
            option.style.margin = '0 var(--spacing-xxs, 1px) var(--spacing-xxs, 1px) 0';
        });
        
        // Optimize action buttons
        modal.querySelectorAll('.modal-actions-container button').forEach(btn => {
            btn.style.height = '32px';
            btn.style.lineHeight = '32px';
            btn.style.padding = '0 var(--spacing-md, 6px)';
            btn.style.fontSize = 'var(--font-size-sm, 0.8rem)';
        });
    });
}
