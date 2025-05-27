// Menu Items and Category Management JS
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let categories = [];
    let categoryToDelete = null;
    
    // Initialize the page
    initializePage();
    
    /**
     * Initialize the page with all necessary setup
     */
    function initializePage() {
        // Check authentication first
        if (!checkAuthentication()) {
            window.location.href = '../login.html';
            return;
        }
        
        // Setup event listeners for category management
        setupCategoryManagement();
        
        // Load categories
        loadCategories();
        
        // Log initialization
        console.log('Menu Items page initialized');
    }
    
    /**
     * Check if the user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    function checkAuthentication() {
        const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        const username = sessionStorage.getItem('username') || localStorage.getItem('username');
        
        if (!token || !username) {
            return false;
        }
        return true;
    }
    
    /**
     * Get the current username from storage
     * @returns {string} The current username
     */
    function getCurrentUsername() {
        return sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
    }
    
    /**
     * Set up event listeners and handlers for category management
     */
    function setupCategoryManagement() {
        // Category form submit handler
        document.getElementById('saveCategoryBtn').addEventListener('click', handleCategorySave);
        
        // Delete confirmation button
        const confirmDeleteBtn = document.getElementById('confirmDeleteCategoryBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', deleteCategory);
        }
        
        // Delete button in the edit modal
        const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
        if (deleteCategoryBtn) {
            deleteCategoryBtn.addEventListener('click', function() {
                // Get category id from the form
                categoryToDelete = document.getElementById('categoryId').value;
                
                // Show the delete confirmation modal
                const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteCategoryConfirmModal'));
                deleteConfirmModal.show();
            });
        }
        
        console.log('Category management events initialized');
    }
    
    /**
     * Load categories from the API
     */
    async function loadCategories() {
        try {
            showLoader(true);
            
            const username = getCurrentUsername();
            const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
            
            const response = await fetch('/api/menu-categories', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                // Filter categories by username
                categories = data.data.filter(cat => cat.USERNAME === username);
                
                // Populate any category dropdowns
                populateCategoryDropdowns(categories);
                
                // Additional rendering logic if needed
                console.log(`Loaded ${categories.length} categories for user ${username}`);
            } else {
                throw new Error(data.message || 'Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Error loading categories: ' + error.message, true);
        } finally {
            showLoader(false);
        }
    }
    
    /**
     * Populate all category dropdowns in the page
     * @param {Array} categoryList - List of categories to populate
     */
    function populateCategoryDropdowns(categoryList) {
        // Find all category dropdown elements
        const categoryDropdowns = document.querySelectorAll('.category-dropdown');
        
        if (categoryDropdowns.length === 0) {
            console.log('No category dropdowns found to populate');
            return;
        }
        
        categoryDropdowns.forEach(dropdown => {
            // Clear existing options first (keeping any default options)
            const defaultOption = dropdown.querySelector('option[value=""]');
            dropdown.innerHTML = '';
            
            // Add back the default option if it existed
            if (defaultOption) {
                dropdown.appendChild(defaultOption);
            }
            
            // Add categories as options
            categoryList.forEach(category => {
                if (category.IS_ACTIVE) { // Only add active categories
                    const option = document.createElement('option');
                    option.value = category.CATEGORY_ID;
                    option.textContent = category.NAME;
                    dropdown.appendChild(option);
                }
            });
            
            // Trigger change event to update any dependent elements
            dropdown.dispatchEvent(new Event('change'));
        });
        
        console.log(`Populated ${categoryDropdowns.length} category dropdowns with ${categoryList.length} categories`);
    }
    
    /**
     * Open the category management modal for adding a new category
     */
    window.addCategory = function() {
        // Reset the form
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        
        // Update modal title
        document.getElementById('categoryManagementModalLabel').textContent = 'Add New Category';
        
        // Hide delete button in add mode
        const deleteBtn = document.getElementById('deleteCategoryBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        
        // Update save button text
        document.getElementById('saveCategoryBtn').textContent = 'Add Category';
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('categoryManagementModal'));
        modal.show();
    };
    
    /**
     * Open the category management modal for editing an existing category
     * @param {number} categoryId - The ID of the category to edit
     */
    window.editCategory = function(categoryId) {
        // Find the category in our local data
        const category = categories.find(c => c.CATEGORY_ID === parseInt(categoryId));
        if (!category) {
            showToast('Category not found', true);
            return;
        }
        
        // Update form fields
        document.getElementById('categoryId').value = category.CATEGORY_ID;
        document.getElementById('categoryName').value = category.NAME || '';
        document.getElementById('categoryDescription').value = category.DESCRIPTION || '';
        document.getElementById('categorySequence').value = category.DISPLAY_ORDER || 10;
        document.getElementById('categoryActive').checked = category.IS_ACTIVE === true;
        
        // Update modal title
        document.getElementById('categoryManagementModalLabel').textContent = 'Edit Category';
        
        // Show delete button in edit mode
        const deleteBtn = document.getElementById('deleteCategoryBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
        
        // Update save button text
        document.getElementById('saveCategoryBtn').textContent = 'Save Changes';
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('categoryManagementModal'));
        modal.show();
    };
    
    /**
     * Handle category save (both add and edit)
     */
    async function handleCategorySave() {
        try {
            // Validate form
            const categoryNameInput = document.getElementById('categoryName');
            if (!categoryNameInput.value.trim()) {
                showToast('Category name is required', true);
                categoryNameInput.focus();
                return;
            }
            
            // Get the current username from localStorage
            const username = getCurrentUsername();
            if (!username || username === 'unknown_user') {
                showToast('User authentication error. Please log in again.', true);
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 2000);
                return;
            }
            
            // Get form values
            const categoryId = document.getElementById('categoryId').value;
            const isEdit = categoryId !== '';
            
            // Prepare category data
            const categoryData = {
                NAME: document.getElementById('categoryName').value.trim(),
                DESCRIPTION: document.getElementById('categoryDescription').value.trim(),
                DISPLAY_ORDER: parseInt(document.getElementById('categorySequence').value) || 10,
                IS_ACTIVE: document.getElementById('categoryActive').checked,
                USERNAME: username // Set the username to the current logged-in user
            };
            
            console.log('Setting category username to:', username);
            
            // Add timestamps and user info
            const now = new Date().toISOString();
            
            if (isEdit) {
                categoryData.UPDATED_BY = username;
                categoryData.UPDATED_AT = now;
            } else {
                categoryData.CREATED_BY = username;
                categoryData.CREATED_AT = now;
                categoryData.UPDATED_BY = username;
                categoryData.UPDATED_AT = now;
            }
            
            // Disable the save button and show loading state
            const saveBtn = document.getElementById('saveCategoryBtn');
            const originalBtnText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            
            // Determine API endpoint and method
            let url = '/api/menu-categories';
            let method = 'POST';
            
            if (isEdit) {
                url = `/api/menu-categories/${categoryId}`;
                method = 'PUT';
            }
            
            // Get auth token from storage
            const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
            
            // Make API call
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(categoryData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update local data
                if (isEdit) {
                    // Find and update the category in our array
                    const index = categories.findIndex(c => c.CATEGORY_ID === parseInt(categoryId));
                    if (index !== -1) {
                        categories[index] = {...categories[index], ...categoryData};
                    }
                } else {
                    // Add the new category to our array
                    if (result.data) {
                        categories.push(result.data);
                    }
                }
                
                // Refresh dropdowns
                populateCategoryDropdowns(categories);
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('categoryManagementModal'));
                modal.hide();
                
                // Show success message
                showToast(`Category ${isEdit ? 'updated' : 'added'} successfully`);
            } else {
                throw new Error(result.message || `Failed to ${isEdit ? 'update' : 'add'} category`);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Error: ' + error.message, true);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('saveCategoryBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = categoryId ? 'Save Changes' : 'Add Category';
        }
    }
    
    /**
     * Delete a category
     */
    async function deleteCategory() {
        if (!categoryToDelete) {
            showToast('No category selected for deletion', true);
            return;
        }
        
        try {
            // Disable button and show loading state
            const deleteBtn = document.getElementById('confirmDeleteCategoryBtn');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
            
            // Get auth token
            const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
            
            // Make API call
            const response = await fetch(`/api/menu-categories/${categoryToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Remove from local data
                categories = categories.filter(c => c.CATEGORY_ID !== parseInt(categoryToDelete));
                
                // Refresh dropdowns
                populateCategoryDropdowns(categories);
                
                // Close the confirmation modal
                const confirmModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryConfirmModal'));
                confirmModal.hide();
                
                // Close the edit modal if it's open
                const editModal = bootstrap.Modal.getInstance(document.getElementById('categoryManagementModal'));
                if (editModal) {
                    editModal.hide();
                }
                
                // Show success message
                showToast('Category deleted successfully');
            } else {
                throw new Error(result.message || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Error: ' + error.message, true);
        } finally {
            // Reset button state
            const deleteBtn = document.getElementById('confirmDeleteCategoryBtn');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = 'Delete';
            
            // Reset the categoryToDelete
            categoryToDelete = null;
        }
    }
    
    /**
     * Show or hide the page loader
     * @param {boolean} show - Whether to show or hide the loader
     */
    function showLoader(show) {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            if (show) {
                loader.style.display = 'flex';
            } else {
                loader.style.display = 'none';
            }
        }
    }
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {boolean} isError - Whether this is an error message
     */
    function showToast(message, isError = false) {
        // Check for toast-container, create one if not exists
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${isError ? 'bg-danger text-white' : 'bg-success text-white'}`;
        toastEl.id = toastId;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="toast-header ${isError ? 'bg-danger text-white' : 'bg-success text-white'}">
                <strong class="me-auto">${isError ? 'Error' : 'Success'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        // Add to container
        toastContainer.appendChild(toastEl);
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(toastEl, {
            delay: 5000,
            autohide: true
        });
        toast.show();
        
        // Remove from DOM after hidden
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastEl.remove();
        });
    }
});