// Test function to validate order details modal compact styling
function validateOrderDetailsModalCompactness() {
    console.log('=== ORDER DETAILS MODAL COMPACT UI VALIDATOR ===');
    
    // Find the order details modal
    const modal = document.querySelector('.order-details-modal');
    if (!modal) {
        console.error('Order details modal not found in the DOM');
        return false;
    }
    
    // Check if modal has compact styling
    const modalStyle = window.getComputedStyle(modal);
    console.log('Modal width:', modalStyle.width);
    console.log('Modal height:', modalStyle.height);
    console.log('Modal border-radius:', modalStyle.borderRadius);
    
    // Check if modal header has compact styling
    const header = modal.querySelector('.modal-header');
    if (header) {
        const headerStyle = window.getComputedStyle(header);
        console.log('Header height:', headerStyle.height);
        console.log('Header padding:', headerStyle.padding);
    } else {
        console.error('Modal header not found');
    }
    
    // Check if modal content has compact styling
    const content = modal.querySelector('.modal-content');
    if (content) {
        const contentStyle = window.getComputedStyle(content);
        console.log('Content padding:', contentStyle.padding);
        console.log('Content max-height:', contentStyle.maxHeight);
    } else {
        console.error('Modal content not found');
    }
    
    // Check item rows styling
    const itemRows = modal.querySelectorAll('.kitchen-item-row');
    if (itemRows.length > 0) {
        const rowStyle = window.getComputedStyle(itemRows[0]);
        console.log('Item row padding:', rowStyle.padding);
        console.log('Item row margin:', rowStyle.margin);
        console.log('Total item rows:', itemRows.length);
    } else {
        console.log('No kitchen item rows found (modal may not be populated yet)');
    }
    
    // Check variation styling
    const variations = modal.querySelectorAll('.kitchen-variation-option');
    if (variations.length > 0) {
        const varStyle = window.getComputedStyle(variations[0]);
        console.log('Variation font-size:', varStyle.fontSize);
        console.log('Variation padding:', varStyle.padding);
        console.log('Total variations:', variations.length);
    } else {
        console.log('No variation options found (modal may not be populated yet)');
    }
    
    console.log('=== VALIDATION COMPLETE ===');
    return true;
}

// Usage: Call this function after opening an order details modal
// Example: document.querySelector('.order-details-modal-trigger').click(); setTimeout(validateOrderDetailsModalCompactness, 500);
