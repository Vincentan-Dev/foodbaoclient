// Apply compact UI to all pages
document.addEventListener('DOMContentLoaded', function() {
    // Skip if we're already on a page with compact-ui.css
    if (document.querySelector('link[href*="compact-ui.css"]')) {
        return;
    }
    
    // Determine the correct path based on the current URL
    let cssPath = 'css/compact-ui.css';
    
    // If we're in a subdirectory page (e.g., /pages/), adjust the path
    if (window.location.pathname.includes('/pages/')) {
        cssPath = '../css/compact-ui.css';
    }
    
    // Create link element for compact-ui.css with the correct path
    const compactUiLink = document.createElement('link');
    compactUiLink.rel = 'stylesheet';
    compactUiLink.href = cssPath;
    
    // Append to head
    document.head.appendChild(compactUiLink);
    
    console.log('Compact UI styles automatically applied with path: ' + cssPath);
});
