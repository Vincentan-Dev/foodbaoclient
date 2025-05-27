// Advanced Compact UI Loader
// This script automatically applies the advanced compact UI styling to all pages
document.addEventListener('DOMContentLoaded', function() {
    // Skip if we're already on a page with compact-ui-advanced.css
    if (document.querySelector('link[href*="compact-ui-advanced.css"]')) {
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
    
    console.log('Advanced Compact UI styles automatically applied with path: ' + cssPath);
    
    // Apply additional runtime adjustments for even more compact UI
    setTimeout(function() {
        // Reduce padding on all sections
        document.querySelectorAll('.section, .container, .row, .col').forEach(el => {
            el.style.padding = '2px';
        });
        
        // Make modals more compact
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.padding = '4px';
            
            // Adjust modal content padding
            const content = modal.querySelector('.modal-content');
            if (content) content.style.padding = '4px';
            
            // Adjust modal footer padding
            const footer = modal.querySelector('.modal-footer');
            if (footer) {
                footer.style.padding = '2px 4px';
                footer.style.minHeight = 'auto';
            }
        });
        
        // Make tables more compact
        document.querySelectorAll('table tr').forEach(tr => {
            tr.style.height = 'auto';
            tr.style.minHeight = '28px';
        });
        
        document.querySelectorAll('table td, table th').forEach(cell => {
            cell.style.padding = '2px 4px';
        });
        
        // Adjust input field heights
        document.querySelectorAll('input').forEach(input => {
            if (input.type !== 'checkbox' && input.type !== 'radio') {
                input.style.height = '2rem';
                input.style.marginBottom = '2px';
            }
        });
        
        // Make buttons more compact
        document.querySelectorAll('.btn, .btn-flat').forEach(btn => {
            btn.style.height = '30px';
            btn.style.lineHeight = '30px';
            btn.style.padding = '0 8px';
        });
        
        document.querySelectorAll('.btn-small').forEach(btn => {
            btn.style.height = '26px';
            btn.style.lineHeight = '26px';
            btn.style.padding = '0 6px';
        });
        
        // Remove excessive margins
        document.querySelectorAll('.card, .card-panel').forEach(card => {
            card.style.margin = '2px 0';
        });
        
        // Remove dashed borders that take space
        document.querySelectorAll('.order-footer, .item-footer').forEach(el => {
            el.style.borderTop = '1px solid #eee';
        });
        
        // Compact grid layouts
        document.querySelectorAll('.orders-grid').forEach(grid => {
            grid.style.gap = '2px';
        });
        
        // Add a class to the body for easier targeting
        document.body.classList.add('compact-ui-advanced');
        
    }, 300); // Small delay to ensure DOM is fully rendered
});
