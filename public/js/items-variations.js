/**
 * Items Variations Module
 * Manages all item variations functionality
 */
const ItemsVariationsModule = (function() {
    // Private variables
    let variations = [];
    let menuItems = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalPages = 1;
    let currentVariationId = null;
    
    // DOM Elements
    const variationsList = document.getElementById('variations-list');
    const variationsLoading = document.getElementById('variations-loading');
    const paginationContainer = document.getElementById('pagination-container');
    const searchInput = document.getElementById('search-variations');
    
    // Add variation form elements
    const addVariationForm = document.getElementById('add-variation-form');
    const menuItemSelect = document.getElementById('menu-item-select');
    const variationName = document.getElementById('variation-name');
    const variationPrice = document.getElementById('variation-price');
    const variationDescription = document.getElementById('variation-description');
    const variationActive = document.getElementById('variation-active');
    
    // Edit variation form elements
    const editVariationForm = document.getElementById('edit-variation-form');
    const editVariationId = document.getElementById('edit-variation-id');
    const editMenuItemSelect = document.getElementById('edit-menu-item-select');
    const editVariationName = document.getElementById('edit-variation-name');
    const editVariationPrice = document.getElementById('edit-variation-price');
    const editVariationDescription = document.getElementById('edit-variation-description');
    const editVariationActive = document.getElementById('edit-variation-active');
    const deleteVariationBtn = document.getElementById('delete-variation-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // API endpoints
    const API_ENDPOINTS = {
        VARIATIONS: '../api/item-variations',
        MENU_ITEMS: '../api/menu-items'
    };
    
    /**
     * Initialize the module
     */
    function init() {
        // Load data
        loadMenuItems();
        loadVariations();
        
        // Set up event listeners
        setupEventListeners();
    }
    
    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                currentPage = 1;
                loadVariations();
            }, 300));
        }
        
        // Add variation form submission
        if (addVariationForm) {
            addVariationForm.addEventListener('submit', function(e) {
                e.preventDefault();
                addVariation();
            });
        }
        
        // Edit variation form submission
        if (editVariationForm) {
            editVariationForm.addEventListener('submit', function(e) {
                e.preventDefault();
                updateVariation();
            });
        }
        
        // Delete variation
        if (deleteVariationBtn) {
            deleteVariationBtn.addEventListener('click', function() {
                const deleteConfirmModal = M.Modal.getInstance(document.getElementById('delete-confirm-modal'));
                if (deleteConfirmModal) {
                    deleteConfirmModal.open();
                }
            });
        }
        
        // Confirm delete
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                deleteVariation(currentVariationId);
            });
        }
    }
    
    /**
     * Load menu items from API
     */
    async function loadMenuItems() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                authService.redirectToLogin();
                return;
            }
            
            const response = await fetch(API_ENDPOINTS.MENU_ITEMS, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load menu items: ${response.status}`);
            }
            
            const data = await response.json();
            menuItems = data.items || [];
            
            // Populate select dropdowns
            populateMenuItemSelects();
            
        } catch (error) {
            console.error('Error loading menu items:', error);
            showToast('Error loading menu items: ' + error.message, 'error');
        }
    }
    
    /**
     * Populate menu item select dropdowns
     */
    function populateMenuItemSelects() {
        const selects = [menuItemSelect, editMenuItemSelect];
        
        selects.forEach(select => {
            if (!select) return;
            
            // Clear existing options except the placeholder
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add menu items as options
            menuItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                select.appendChild(option);
            });
            
            // Reinitialize Materialize select
            if (M && M.FormSelect) {
                M.FormSelect.init(select);
            }
        });
    }
    
    /**
     * Load variations from API
     */
    async function loadVariations() {
        if (variationsLoading) {
            variationsLoading.style.display = 'block';
        }
        
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                authService.redirectToLogin();
                return;
            }
            
            const searchTerm = searchInput ? searchInput.value : '';
            const url = `${API_ENDPOINTS.VARIATIONS}?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load variations: ${response.status}`);
            }
            
            const data = await response.json();
            variations = data.variations || [];
            totalPages = data.totalPages || 1;
            
            // Render variations
            renderVariations();
            
            // Update pagination
            renderPagination();
            
        } catch (error) {
            console.error('Error loading variations:', error);
            showToast('Error loading variations: ' + error.message, 'error');
            
            // Show empty state
            renderEmptyState('Error loading variations. Please try again.');
        } finally {
            if (variationsLoading) {
                variationsLoading.style.display = 'none';
            }
        }
    }
    
    /**
     * Render variations list
     */
    function renderVariations() {
        if (!variationsList) return;
        
        // Clear existing items except header and loading
        const items = variationsList.querySelectorAll('.collection-item:not(#variations-loading)');
        items.forEach(item => item.remove());
        
        // Hide loading indicator
        if (variationsLoading) {
            variationsLoading.style.display = 'none';
        }
        
        // If no variations, show empty state
        if (!variations.length) {
            renderEmptyState('No variations found.');
            return;
        }
        
        // Create variation items
        variations.forEach(variation => {
            const item = document.createElement('div');
            item.className = 'collection-item';
            item.setAttribute('data-id', variation.id);
            
            const menuItem = menuItems.find(item => item.id === variation.menuItemId) || { name: 'Unknown' };
            
            item.innerHTML = `
                <div class="row valign-wrapper">
                    <div class="col s5 truncate">${variation.name}</div>
                    <div class="col s4 truncate">${menuItem.name}</div>
                    <div class="col s2">$${parseFloat(variation.price).toFixed(2)}</div>
                    <div class="col s1">
                        <a href="#!" class="edit-variation-btn">
                            <i class="material-icons">edit</i>
                        </a>
                    </div>
                </div>
            `;
            
            // Add click event to edit button
            const editBtn = item.querySelector('.edit-variation-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => openEditModal(variation));
            }
            
            // Add click event to row
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.edit-variation-btn')) {
                    openEditModal(variation);
                }
            });
            
            variationsList.appendChild(item);
        });
    }
    
    /**
     * Render empty state
     * @param {string} message - Message to display
     */
    function renderEmptyState(message) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'collection-item center-align';
        emptyItem.innerHTML = `
            <p>${message}</p>
            <button class="btn waves-effect waves-light modal-trigger" data-target="add-variation-modal">
                <i class="material-icons left">add</i>Add Your First Variation
            </button>
        `;
        
        variationsList.appendChild(emptyItem);
        
        // Initialize modals for the newly added button
        const modalTriggers = emptyItem.querySelectorAll('.modal-trigger');
        if (modalTriggers.length && M && M.Modal) {
            M.Modal.init(modalTriggers);
        }
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination() {
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'block';
        
        const pagination = document.createElement('ul');
        pagination.className = 'pagination';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = currentPage === 1 ? 'disabled' : 'waves-effect';
        prevLi.innerHTML = `<a href="#!"><i class="material-icons">chevron_left</i></a>`;
        
        if (currentPage > 1) {
            prevLi.addEventListener('click', () => {
                currentPage--;
                loadVariations();
            });
        }
        
        pagination.appendChild(prevLi);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust start if end is at max
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = i === currentPage ? 'active' : 'waves-effect';
            pageLi.innerHTML = `<a href="#!">${i}</a>`;
            
            if (i !== currentPage) {
                pageLi.addEventListener('click', () => {
                    currentPage = i;
                    loadVariations();
                });
            }
            
            pagination.appendChild(pageLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = currentPage === totalPages ? 'disabled' : 'waves-effect';
        nextLi.innerHTML = `<a href="#!"><i class="material-icons">chevron_right</i></a>`;
        
        if (currentPage < totalPages) {
            nextLi.addEventListener('click', () => {
                currentPage++;
                loadVariations();
            });
        }
        
        pagination.appendChild(nextLi);
        
        // Replace existing pagination
        paginationContainer.innerHTML = '';
        paginationContainer.appendChild(pagination);
    }
    
    /**
     * Open edit variation modal
     * @param {Object} variation - Variation data
     */
    function openEditModal(variation) {
        if (!editVariationForm) return;
        
        currentVariationId = variation.id;
        editVariationId.value = variation.id;
        editVariationName.value = variation.name;
        editVariationPrice.value = variation.price;
        editVariationDescription.value = variation.description || '';
        editVariationActive.checked = variation.active;
        
        // Select the correct menu item
        if (editMenuItemSelect) {
            editMenuItemSelect.value = variation.menuItemId;
            
            // Update Materialize select
            if (M && M.FormSelect) {
                M.FormSelect.init(editMenuItemSelect);
            }
        }
        
        // Update textarea to show text correctly
        if (M && M.updateTextFields) {
            M.updateTextFields();
        }
        
        // Open modal
        const modal = M.Modal.getInstance(document.getElementById('edit-variation-modal'));
        if (modal) {
            modal.open();
        }
    }
    
    /**
     * Add new variation
     */
    async function addVariation() {
        try {
            if (!addVariationForm) return;
            
            const token = localStorage.getItem('auth_token');
            if (!token) {
                authService.redirectToLogin();
                return;
            }
            
            const variationData = {
                name: variationName.value,
                menuItemId: menuItemSelect.value,
                price: parseFloat(variationPrice.value),
                description: variationDescription.value,
                active: variationActive.checked
            };
            
            const response = await fetch(API_ENDPOINTS.VARIATIONS, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(variationData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add variation: ${response.status}`);
            }
            
            // Show success message
            showToast('Variation added successfully', 'success');
            
            // Reset form
            addVariationForm.reset();
            
            // Close modal
            const modal = M.Modal.getInstance(document.getElementById('add-variation-modal'));
            if (modal) {
                modal.close();
            }
            
            // Reload variations
            loadVariations();
            
        } catch (error) {
            console.error('Error adding variation:', error);
            showToast('Error adding variation: ' + error.message, 'error');
        }
    }
    
    /**
     * Update variation
     */
    async function updateVariation() {
        try {
            if (!editVariationForm) return;
            
            const token = localStorage.getItem('auth_token');
            if (!token) {
                authService.redirectToLogin();
                return;
            }
            
            const variationId = editVariationId.value;
            const variationData = {
                name: editVariationName.value,
                menuItemId: editMenuItemSelect.value,
                price: parseFloat(editVariationPrice.value),
                description: editVariationDescription.value,
                active: editVariationActive.checked
            };
            
            const response = await fetch(`${API_ENDPOINTS.VARIATIONS}/${variationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(variationData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update variation: ${response.status}`);
            }
            
            // Show success message
            showToast('Variation updated successfully', 'success');
            
            // Close modal
            const modal = M.Modal.getInstance(document.getElementById('edit-variation-modal'));
            if (modal) {
                modal.close();
            }
            
            // Reload variations
            loadVariations();
            
        } catch (error) {
            console.error('Error updating variation:', error);
            showToast('Error updating variation: ' + error.message, 'error');
        }
    }
    
    /**
     * Delete variation
     * @param {string} variationId - Variation ID to delete
     */
    async function deleteVariation(variationId) {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                authService.redirectToLogin();
                return;
            }
            
            const response = await fetch(`${API_ENDPOINTS.VARIATIONS}/${variationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete variation: ${response.status}`);
            }
            
            // Show success message
            showToast('Variation deleted successfully', 'success');
            
            // Close modal
            const modal = M.Modal.getInstance(document.getElementById('edit-variation-modal'));
            if (modal) {
                modal.close();
            }
            
            // Reload variations
            loadVariations();
            
        } catch (error) {
            console.error('Error deleting variation:', error);
            showToast('Error deleting variation: ' + error.message, 'error');
        }
    }
    
    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Type of toast (success, error)
     */
    function showToast(message, type = 'success') {
        if (M && M.toast) {
            const classes = type === 'success' ? 'green' : 'red';
            M.toast({ html: message, classes });
        } else {
            alert(message);
        }
    }
    
    /**
     * Debounce function to limit how often a function can be called
     * @param {Function} func - Function to debounce
     * @param {number} wait - Time to wait in ms
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Public API
    return {
        init
    };
})();