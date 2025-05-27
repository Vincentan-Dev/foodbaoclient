(function() {
    console.log('Sidenav Fix script loaded');
    
    function initSidenav() {
        console.log('Attempting to initialize sidenav');
        
        // Get elements
        const sidenavTriggers = document.querySelectorAll('.sidenav-trigger');
        const sidenavs = document.querySelectorAll('.sidenav');
        
        if (!sidenavTriggers.length || !sidenavs.length) {
            console.warn('Sidenav elements not found, retrying in 500ms');
            setTimeout(initSidenav, 500);
            return;
        }
        
        // Try to use Materialize
        if (typeof M !== 'undefined') {
            try {
                console.log('Initializing sidenav with Materialize');
                const instances = M.Sidenav.init(sidenavs);
                console.log('Materialize sidenav initialized:', instances);
            } catch (err) {
                console.error('Error initializing Materialize sidenav:', err);
                setupManualSidenav();
            }
        } else {
            console.warn('Materialize not available, using manual sidenav');
            setupManualSidenav();
        }
    }
    
    function setupManualSidenav() {
        console.log('Setting up manual sidenav');
        
        // Get elements
        const triggers = document.querySelectorAll('.sidenav-trigger');
        
        triggers.forEach(trigger => {
            const targetId = trigger.getAttribute('data-target');
            const sidenav = document.getElementById(targetId);
            
            if (!sidenav) {
                console.error('Target sidenav not found:', targetId);
                return;
            }
            
            // Set up CSS
            sidenav.style.transform = 'translateX(-100%)';
            sidenav.style.transition = 'transform 0.3s';
            sidenav.style.position = 'fixed';
            sidenav.style.top = '0';
            sidenav.style.left = '0';
            sidenav.style.width = '250px';
            sidenav.style.height = '100%';
            sidenav.style.zIndex = '1000';
            sidenav.style.backgroundColor = 'white';
            sidenav.style.overflowY = 'auto';
            
            // Create overlay
            let overlay = document.querySelector('.manual-sidenav-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'manual-sidenav-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.right = '0';
                overlay.style.bottom = '0';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
                overlay.style.zIndex = '999';
                overlay.style.display = 'none';
                document.body.appendChild(overlay);
            }
            
            // Add click event to trigger
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Manual sidenav trigger clicked');
                
                sidenav.style.transform = 'translateX(0)';
                overlay.style.display = 'block';
            });
            
            // Add click event to overlay
            overlay.addEventListener('click', function() {
                sidenav.style.transform = 'translateX(-100%)';
                overlay.style.display = 'none';
            });
            
            console.log('Manual sidenav setup complete for', targetId);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidenav);
    } else {
        initSidenav();
    }
    
    // Also try again after window load
    window.addEventListener('load', initSidenav);
})();