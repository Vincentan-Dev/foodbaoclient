/**
 * FoodBao Modal Standardizer
 * This script automatically standardizes all modals to a 95% frame size
 * with compact UI styling, regardless of where or how they are called.
 */

(function() {
    // Apply as soon as DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeModalStandardizer);
    } else {
        initializeModalStandardizer();
    }
    
    function initializeModalStandardizer() {
        console.log('Modal Standardizer initialized');
        
        // Apply the standardization immediately to any existing modals
        standardizeAllModals();
        
        // Set up a MutationObserver to detect when new modals are added to the DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check if any of the added nodes are modals or contain modals
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            if (node.classList && node.classList.contains('modal')) {
                                standardizeModal(node);
                            } else if (node.querySelectorAll) {
                                // Look for modals within this node
                                const nestedModals = node.querySelectorAll('.modal');
                                nestedModals.forEach(standardizeModal);
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also handle modals that are created/opened via Materialize's Modal.init
        patchMaterializeModal();
    }
    
    function standardizeAllModals() {
        // Process all modals in the document
        const modals = document.querySelectorAll('.modal');
        modals.forEach(standardizeModal);
    }
    
    function standardizeModal(modal) {
        // Skip if already processed
        if (modal.dataset.standardized === 'true') return;
        modal.dataset.standardized = 'true';
        
        console.log('Standardizing modal', modal.id || 'unnamed modal');
        
        // Set standardized size (95% of viewport)
        modal.style.width = '95%';
        modal.style.maxWidth = '95%';
        modal.style.height = '95%';
        modal.style.maxHeight = '95%';
        modal.style.top = '2.5%';
        
        // Apply compact styling
        modal.style.padding = '0';
        modal.style.borderRadius = '3px';
        modal.style.overflow = 'hidden';
        
        // Adjust modal content
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.padding = '3px 5px';
            content.style.maxHeight = 'calc(100% - 56px)'; // Adjust for footer height
            content.style.overflowY = 'auto';
        }
        
        // Adjust modal header if present
        const header = modal.querySelector('.modal-header');
        if (header) {
            header.style.padding = '3px 5px';
            header.style.minHeight = '36px';
        }
        
        // Adjust modal footer
        const footer = modal.querySelector('.modal-footer');
        if (footer) {
            footer.style.padding = '2px 5px';
            footer.style.height = 'auto';
            footer.style.minHeight = '36px';
            
            // Make footer buttons more compact
            const buttons = footer.querySelectorAll('.btn, .btn-flat');
            buttons.forEach(btn => {
                btn.style.height = '30px';
                btn.style.lineHeight = '30px';
                btn.style.padding = '0 6px';
                btn.style.margin = '1px';
                btn.style.fontSize = '0.8rem';
            });
        }
        
        // Apply custom style changes for specific modal classes
        if (modal.classList.contains('bottom-sheet')) {
            // Bottom sheet modals need different treatment
            modal.style.height = '85%';
            modal.style.bottom = '0';
            modal.style.top = 'auto';
            modal.style.borderBottomLeftRadius = '0';
            modal.style.borderBottomRightRadius = '0';
        }
    }
    
    function patchMaterializeModal() {
        // Check if Materialize is available
        if (window.M && M.Modal) {
            // Save the original init function
            const originalInit = M.Modal.prototype.init;
            
            // Override the init function
            M.Modal.prototype.init = function() {
                // Call the original init first
                originalInit.apply(this, arguments);
                
                // Then apply our standardization
                if (this.el) {
                    standardizeModal(this.el);
                }
                
                // Force update modal options for size
                if (this.options) {
                    this.options.inDuration = 250;  // Faster opening animation
                    this.options.outDuration = 200; // Faster closing animation
                }
            };
            
            // Re-initialize any already initialized modals
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.M_Modal) {
                    standardizeModal(modal);
                }
            });
            
            console.log('Materialize Modal patched for standardization');
        }
    }
})();
