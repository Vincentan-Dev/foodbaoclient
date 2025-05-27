/**
 * Variations Modal JS
 * Handles menu item variation selection, pricing, and management.
 */

// Modal elements
let variationsModal;
let availableVariationsContainer;
let selectedVariationsContainer;
let saveVariationsButton;
let cancelVariationsButton;
let currentMenuItemId;

// Data collections
let availableVariations = [];
let selectedVariations = [];

/**
 * Initialize the variations modal and set up event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
    // Create modal in the DOM if it doesn't exist
    if (!document.getElementById('variationsModal')) {
        createVariationsModal();
    }
    
    // Cache DOM elements
    variationsModal = document.getElementById('variationsModal');
    availableVariationsContainer = document.getElementById('availableVariationsContainer');
    selectedVariationsContainer = document.getElementById('selectedVariationsContainer');
    saveVariationsButton = document.getElementById('saveVariationsButton');
    cancelVariationsButton = document.getElementById('cancelVariationsButton');
    
    // Set up event listeners
    saveVariationsButton.addEventListener('click', saveVariations);
    cancelVariationsButton.addEventListener('click', closeVariationsModal);
    
    // Close modal when clicking on the X button
    document.getElementById('closeVariationsModal').addEventListener('click', closeVariationsModal);
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === variationsModal) {
            closeVariationsModal();
        }
    });
});

/**
 * Create variations modal in the DOM
 */
function createVariationsModal() {
    const modalHTML = `
        <div class="full-frame-modal" id="variationsModal">
            <div class="full-frame-modal-header">
                <h2 class="full-frame-modal-title">Manage Item Variations</h2>
                <button type="button" class="full-frame-modal-close" id="closeVariationsModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="full-frame-modal-body variations-container">
                <div class="row">
                    <!-- Available variations frame (top) -->
                    <div class="col-12 mb-2">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0">Available Variations</h5>
                                <span class="badge bg-primary" id="availableVariationsCount">0</span>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th class="col-name">Name</th>
                                                <th class="col-price">Price</th>
                                                <th class="col-actions"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="availableVariationsContainer">
                                            <tr>
                                                <td colspan="3" class="text-center py-2 empty-message">Loading variations...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Selected variations frame (bottom) -->
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0">Selected Variations</h5>
                                <span class="badge bg-success" id="selectedVariationsCount">0</span>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th class="col-name">Name</th>
                                                <th class="col-price">Price</th>
                                                <th class="col-actions"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="selectedVariationsContainer">
                                            <tr id="noSelectedVariations">
                                                <td colspan="3" class="text-center py-2 empty-message">No variations selected</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="full-frame-modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-sm" id="cancelVariationsButton">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" id="saveVariationsButton">Save Variations</button>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Open the variations modal for a specific menu item
 * @param {number} menuItemId - The ID of the menu item to manage variations for
 */
function openVariationsModal(menuItemId) {
    if (!menuItemId) {
        console.error('Menu item ID is required');
        showError('Invalid menu item selected');
        return;
    }
    
    currentMenuItemId = menuItemId;
    
    // Reset data
    availableVariations = [];
    selectedVariations = [];
    
    // Show loading state
    availableVariationsContainer.innerHTML = `<tr><td colspan="3" class="text-center py-2"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Loading variations...</td></tr>`;
    selectedVariationsContainer.innerHTML = `<tr id="noSelectedVariations"><td colspan="3" class="text-center py-2">No variations selected</td></tr>`;
    
    // Show modal
    variationsModal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Fetch data
    Promise.all([
        fetchAvailableVariations(),
        fetchExistingVariations(menuItemId)
    ]).then(() => {
        // Update UI counters
        updateVariationCounters();
    }).catch(error => {
        console.error('Error loading variations:', error);
        showError('Failed to load variations. Please try again.');
    });
}

/**
 * Close the variations modal
 */
function closeVariationsModal() {
    variationsModal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
    currentMenuItemId = null;
}

/**
 * Fetch available variations for the current user
 */
async function fetchAvailableVariations() {
    try {
        // Get username from session/local storage
        const username = sessionStorage.getItem('username') || localStorage.getItem('username');
        
        if (!username) {
            throw new Error('User not authenticated');
        }
        
        // Get auth token
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // Fetch variations for the current user
        const response = await fetch('/api/item-variations', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch variations');
        }
        
        // Get raw text first to help with debugging
        const responseText = await response.text();
        
        try {
            // Try to parse as JSON
            const data = JSON.parse(responseText);
            
            // Handle different response formats
            if (data && data.success === true && Array.isArray(data.data)) {
                // Standard format with success flag and data array
                availableVariations = data.data.filter(variation => variation.USERNAME === username);
                renderAvailableVariations();
            } else if (data && Array.isArray(data)) {
                // Direct array response
                availableVariations = data.filter(variation => variation.USERNAME === username);
                renderAvailableVariations();
            } else if (data && data.items && Array.isArray(data.items)) {
                // Format with items array
                availableVariations = data.items.filter(variation => variation.USERNAME === username);
                renderAvailableVariations();
            } else if (data && data.variations && Array.isArray(data.variations)) {
                // Format with variations array
                availableVariations = data.variations.filter(variation => variation.USERNAME === username);
                renderAvailableVariations();
            } else if (data && data.results && Array.isArray(data.results)) {
                // Format with results array
                availableVariations = data.results.filter(variation => variation.USERNAME === username);
                renderAvailableVariations();
            } else {
                console.error('Unexpected response format:', data);
                throw new Error('Invalid response format from server');
            }
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError, 'Raw response:', responseText);
            throw new Error('Invalid JSON response from server');
        }
    } catch (error) {
        console.error('Error fetching available variations:', error);
        availableVariationsContainer.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-2 text-danger">
                    <i class="fas fa-exclamation-circle me-1"></i>${error.message || 'Error loading variations'}
                </td>
            </tr>
        `;
    }
}

/**
 * Fetch existing variations for the menu item
 * @param {number} menuItemId - The ID of the menu item
 */
async function fetchExistingVariations(menuItemId) {
    try {
        // Validate menuItemId
        if (!menuItemId || menuItemId === 'null' || menuItemId === 'undefined' || menuItemId === '') {
            console.error('Invalid menuItemId provided:', menuItemId);
            selectedVariationsContainer.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center py-2 text-danger">
                        <i class="fas fa-exclamation-circle me-1"></i>Invalid menu item ID
                    </td>
                </tr>
            `;
            return;
        }
        
        // Get username from storage
        const username = sessionStorage.getItem('username') || localStorage.getItem('username');
        if (!username) {
            throw new Error('User not authenticated - username missing');
        }
        
        console.log(`Fetching variations for menu item ID: ${menuItemId} and username: ${username}`);
        
        // Use a simple GET request to the dedicated worker endpoint with query parameters
        // This avoids complex authentication header issues
        const response = await fetch(`/api/menu-item-variations/simple?itemId=${menuItemId}&username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to fetch variations: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    errorMessage += ` - ${errorJson.message}`;
                }
            } catch (e) {
                if (errorText && errorText.length < 100) {
                    errorMessage += ` - ${errorText}`;
                }
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        // Reset selected variations
        selectedVariations = [];
        
        // Handle the response data
        let variationsData = [];
        if (data && data.success === true && Array.isArray(data.data)) {
            variationsData = data.data;
        } else if (data && Array.isArray(data)) {
            variationsData = data;
        } else if (data && data.variations && Array.isArray(data.variations)) {
            variationsData = data.variations;
        } else if (data && data.results && Array.isArray(data.results)) {
            variationsData = data.results;
        } else {
            console.warn('Unexpected response format:', data);
        }
        
        // Wait for available variations to load if needed
        if (availableVariations.length === 0) {
            console.log('Waiting for available variations to load...');
            await fetchAvailableVariations();
        }
        
        // Process each variation from the API response
        for (const variation of variationsData) {
            const variationId = variation.VARIATION_ID;
            
            if (!variationId) {
                console.warn('Variation missing ID:', variation);
                continue;
            }
            
            // Find matching variation in available variations list for details
            const matchingVar = availableVariations.find(av => 
                String(av.VARIATION_ID) === String(variationId)
            );
            
            if (matchingVar) {
                // Add to selected variations with all required properties
                selectedVariations.push({
                    VARIATION_ID: variationId,
                    NAME: matchingVar.NAME,
                    MENU_ITEM_ID: menuItemId,
                    ITEM_ID: menuItemId,
                    PRICE: variation.PRICE !== undefined ? parseFloat(variation.PRICE) : 
                          (matchingVar.BASE_PRICE !== undefined ? parseFloat(matchingVar.BASE_PRICE) : 0),
                    USERNAME: username
                });
            } else {
                // Add with available data
                selectedVariations.push({
                    VARIATION_ID: variationId,
                    NAME: variation.NAME || `Variation ${variationId}`,
                    MENU_ITEM_ID: menuItemId,
                    ITEM_ID: menuItemId,
                    PRICE: variation.PRICE !== undefined ? parseFloat(variation.PRICE) : 0,
                    USERNAME: username
                });
            }
        }
        
        // Render the selected variations
        renderSelectedVariations();
        
    } catch (error) {
        console.error('Error fetching existing variations:', error);
        selectedVariationsContainer.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-2 text-danger">
                    <i class="fas fa-exclamation-circle me-1"></i>${error.message || 'Error loading existing variations'}
                </td>
            </tr>
        `;
    }
}

/**
 * Render available variations in the top frame
 */
function renderAvailableVariations() {
    if (!availableVariations.length) {
        availableVariationsContainer.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-2 empty-message">No variations available. Create variations first.</td>
            </tr>
        `;
        return;
    }
    
    // Sort variations by name
    const sortedVariations = [...availableVariations].sort((a, b) => 
        a.NAME.localeCompare(b.NAME)
    );
    
    // Generate HTML for each variation with icons instead of text buttons
    const variationsHTML = sortedVariations.map(variation => {
        // Check if this variation is already in the selected list
        const isSelected = selectedVariations.some(selected => 
            selected.VARIATION_ID === variation.VARIATION_ID
        );
        
        // Ensure price is a valid number, default to 0 if not
        const basePrice = variation.BASE_PRICE !== undefined && variation.BASE_PRICE !== null ? 
            parseFloat(variation.BASE_PRICE) : 0;
        
        // Format price with 2 decimal places, handling NaN case
        const formattedPrice = isNaN(basePrice) ? '0.00' : basePrice.toFixed(2);
        
        return `
            <tr data-id="${variation.VARIATION_ID}">
                <td class="col-name">${variation.NAME}</td>
                <td class="col-price">RM${formattedPrice}</td>
                <td class="col-actions text-center">
                    <button class="btn btn-icon btn-sm btn-outline-primary" 
                            ${isSelected ? 'disabled' : ''}
                            onclick="addVariation(${variation.VARIATION_ID})" 
                            title="Add Variation">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    availableVariationsContainer.innerHTML = variationsHTML;
}

/**
 * Render selected variations in the bottom frame
 */
function renderSelectedVariations() {
    if (!selectedVariations.length) {
        selectedVariationsContainer.innerHTML = `
            <tr id="noSelectedVariations">
                <td colspan="3" class="text-center py-2 empty-message">No variations selected</td>
            </tr>
        `;
        return;
    }
    
    // Sort selected variations by name
    const sortedSelected = [...selectedVariations].sort((a, b) => 
        a.NAME ? a.NAME.localeCompare(b.NAME) : 0
    );
    
    // Generate HTML for each selected variation with compact layout and icon buttons
    const selectedHTML = sortedSelected.map((variation, index) => {
        // Find the original variation data if available
        const originalVariation = availableVariations.find(av => av.VARIATION_ID === variation.VARIATION_ID);
        const name = variation.NAME || (originalVariation ? originalVariation.NAME : 'Unknown');
        
        // Parse price and handle NaN cases
        let price = 0;
        if (variation.PRICE !== undefined && variation.PRICE !== null) {
            price = parseFloat(variation.PRICE);
            if (isNaN(price)) price = 0;
        } else if (originalVariation && originalVariation.BASE_PRICE) {
            price = parseFloat(originalVariation.BASE_PRICE);
            if (isNaN(price)) price = 0;
        }
        
        return `
            <tr data-id="${variation.VARIATION_ID}" data-index="${index}">
                <td class="col-name">${name}</td>
                <td class="col-price">
                    <div class="d-flex align-items-center">
                        <span class="me-2">RM</span>
                        <input type="text" class="manual-price-input" 
                               value="${price.toFixed(2)}" 
                               onchange="updateVariationPrice(${index}, this.value)"
                               placeholder="0.00">
                    </div>
                </td>
                <td class="col-actions text-center">
                    <button class="btn btn-icon btn-outline-danger" 
                            onclick="removeVariation(${index})"
                            title="Remove Variation">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    selectedVariationsContainer.innerHTML = selectedHTML;
}

// The rest of the functions remain largely unchanged
function addVariation(variationId) {
    // Find the variation in the available list
    const variation = availableVariations.find(v => v.VARIATION_ID === variationId);
    
    if (!variation) {
        console.error('Variation not found:', variationId);
        return;
    }
    
    // Check if already selected
    if (selectedVariations.some(s => s.VARIATION_ID === variationId)) {
        console.warn('Variation already selected:', variationId);
        return;
    }
    
    // Get username from session/local storage
    const username = sessionStorage.getItem('username') || localStorage.getItem('username');
    
    // Add to selected list with menu item ID and username
    selectedVariations.push({
        MENU_ITEM_ID: currentMenuItemId,
        VARIATION_ID: variation.VARIATION_ID,
        NAME: variation.NAME,
        PRICE: variation.BASE_PRICE,
        USERNAME: username
    });
    
    // Update UI
    renderAvailableVariations();
    renderSelectedVariations();
    updateVariationCounters();
}

function removeVariation(index) {
    if (index < 0 || index >= selectedVariations.length) {
        console.error('Invalid variation index:', index);
        return;
    }
    
    // Remove from selected list
    selectedVariations.splice(index, 1);
    
    // Update UI
    renderAvailableVariations();
    renderSelectedVariations();
    updateVariationCounters();
}

function updateVariationPrice(index, price) {
    if (index < 0 || index >= selectedVariations.length) {
        console.error('Invalid variation index:', index);
        return;
    }
    
    // Parse the price and handle non-numeric input
    const parsedPrice = parseFloat(price);
    
    // Update price in the selected list
    selectedVariations[index].PRICE = isNaN(parsedPrice) ? 0 : parsedPrice;
    
    // Update the display to show the formatted price
    const input = document.querySelector(`tr[data-index="${index}"] .manual-price-input`);
    if (input) {
        input.value = selectedVariations[index].PRICE.toFixed(2);
    }
}

function updateVariationCounters() {
    document.getElementById('availableVariationsCount').textContent = availableVariations.length;
    document.getElementById('selectedVariationsCount').textContent = selectedVariations.length;
}

async function saveVariations() {
    if (!currentMenuItemId) {
        showError('Invalid menu item selected');
        return;
    }
    
    // Get username from session/local storage
    const username = sessionStorage.getItem('username') || localStorage.getItem('username');
    
    // Get authentication token from session/local storage
    const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    if (!username) {
        showError('User not authenticated');
        return;
    }
    
    // Disable save button and show loading state
    saveVariationsButton.disabled = true;
    saveVariationsButton.innerHTML = '<div class="spinner-border spinner-border-sm me-1" role="status"></div> Saving...';
    
    try {
        // Prepare data for saving - ensure all required fields are present
        const variationsToSave = selectedVariations.map(variation => {
            // Ensure variation ID is defined
            if (!variation.VARIATION_ID) {
                console.error('Missing VARIATION_ID in selected variation:', variation);
                throw new Error('One or more selected variations have missing IDs');
            }
            
            return {
                ITEM_ID: parseInt(currentMenuItemId) || null,
                VARIATION_ID: parseInt(variation.VARIATION_ID) || null,
                NAME: variation.NAME || null,
                PRICE: parseFloat(variation.PRICE) || 0,
                USERNAME: username
            };
        });
        
        console.log('Preparing to save variations:', variationsToSave);
        
        // Use the simplified endpoint approach with data in the request body
        const response = await fetch(`/api/menu-item-variations/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Add authentication token
            },
            body: JSON.stringify({
                itemId: currentMenuItemId,
                username: username,
                variations: variationsToSave
            })
        });
        
        if (!response.ok) {
            // Get the error response for better debugging
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                    errorMessage += ` - ${errorData.message}`;
                }
            } catch (e) {
                errorMessage += ` - ${errorText.substring(0, 100)}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            showSuccess('Variations saved successfully!');
            
            // Close modal
            closeVariationsModal();
            
            // Optional: Trigger any menu item refresh function if it exists
            if (typeof refreshMenuItems === 'function') {
                refreshMenuItems();
            }
        } else {
            throw new Error(data.message || 'Failed to save variations');
        }
    } catch (error) {
        console.error('Error saving variations:', error);
        showError(error.message || 'Failed to save variations. Please try again.');
    } finally {
        // Reset button state
        saveVariationsButton.disabled = false;
        saveVariationsButton.innerHTML = 'Save Variations';
    }
}

function showSuccess(message) {
    // Check if toast function exists in parent scope
    if (typeof window.showToast === 'function') {
        window.showToast(message, false);
    } else {
        alert(message);
    }
}

function showError(message) {
    // Check if toast function exists in parent scope
    if (typeof window.showToast === 'function') {
        window.showToast(message, true);
    } else {
        alert('Error: ' + message);
    }
}