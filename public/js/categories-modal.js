/**
 * Categories Modal - Categories management component for menu items page
 * This allows managing categories without navigating away from the menu items page
 */

// Keep track of all categories
let categoriesModalData = {
    categories: [],
    categoryToDelete: null,
    modalMode: 'add',
    selectedCategories: [] // New property for bulk operations
};

// DOM Elements - will be initialized when the modal is opened
let categoryModal;
let categoriesList;
let categoryNameInput;
let categoryDescriptionInput;
let displayOrderInput;
let isActiveInput;
let categoryIdInput;
let imagePreviewElement;
let imageBase64Input;
let saveCategoryBtn;

// Function to open the category modal
function openCategoryModal(mode = 'new', categoryId = null) {
    // Initialize modal if it doesn't exist
    if (!categoryModal) {
        initializeCategoryModal();
    }
    
    // Set the modal mode
    categoriesModalData.modalMode = mode === 'edit' ? 'edit' : 'add';
    
    // Update title
    const modalTitle = document.getElementById('categoryModalLabel');
    if (modalTitle) {
        modalTitle.textContent = categoriesModalData.modalMode === 'add' ? 'Add New Category' : 'Edit Category';
    }
    
    // Reset form
    resetCategoryForm();
    
    // If edit mode, populate form with category data
    if (categoriesModalData.modalMode === 'edit' && categoryId) {
        populateCategoryForm(categoryId);
    }
    
    // Configure save button text
    if (saveCategoryBtn) {
        saveCategoryBtn.innerHTML = categoriesModalData.modalMode === 'add' 
            ? '<i class="fas fa-plus me-2"></i>Add Category' 
            : '<i class="fas fa-save me-2"></i>Save Category';
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(document.getElementById('categoryManagementModal'));
    bsModal.show();
    
    // Refresh categories list
    renderCategoriesList();
}

// Initialize Category Modal
function initializeCategoryModal() {
    // Check if the modal already exists in the DOM
    let existingModal = document.getElementById('categoryManagementModal');
    if (existingModal) {
        return;
    }
    
    // Create modal HTML structure
    const modalHTML = `
    <div class="modal fade" id="categoryManagementModal" tabindex="-1" aria-labelledby="categoryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="categoryModalLabel">Manage Categories</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-5">
                            <div class="categories-sidebar">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="mb-0">Categories</h6>
                                    <!-- New bulk actions dropdown -->
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="bulkActionsDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-cog me-1"></i> Bulk Actions
                                        </button>
                                        <ul class="dropdown-menu" aria-labelledby="bulkActionsDropdown">
                                            <li><a class="dropdown-item" href="#" id="bulkActivateBtn"><i class="fas fa-check-circle me-2"></i>Activate Selected</a></li>
                                            <li><a class="dropdown-item" href="#" id="bulkDeactivateBtn"><i class="fas fa-times-circle me-2"></i>Deactivate Selected</a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-danger" href="#" id="bulkDeleteBtn"><i class="fas fa-trash me-2"></i>Delete Selected</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <!-- New search input -->
                                <div class="input-group mb-3">
                                    <input type="text" class="form-control form-control-sm" id="categorySearchInput" placeholder="Search categories...">
                                    <button class="btn btn-outline-secondary btn-sm" type="button" id="clearSearchBtn">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div id="categoriesList" class="list-group categories-list">
                                    <!-- Categories will be listed here -->
                                </div>
                                <button id="addNewCategoryBtn" class="btn btn-sm btn-primary mt-3">
                                    <i class="fas fa-plus me-1"></i> Add New Category
                                </button>
                            </div>
                        </div>
                        <div class="col-md-7">
                            <form id="categoryForm">
                                <input type="hidden" id="categoryFormId">
                                <div class="form-group mb-3">
                                    <label for="categoryName">Category Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="categoryName" required placeholder="e.g. Main Courses">
                                    <div class="invalid-feedback" id="categoryNameFeedback"></div>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label for="categoryDescription">Description</label>
                                    <textarea class="form-control" id="categoryDescription" rows="3" placeholder="Describe this category..."></textarea>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="displayOrder">Display Order <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="displayOrder" min="1" value="1">
                                            <div class="invalid-feedback" id="displayOrderFeedback"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="isActive">Status</label>
                                            <select class="form-select" id="isActive">
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label for="categoryImageUpload">Category Image</label>
                                    <div class="input-group">
                                        <input type="file" class="form-control" id="categoryImageUpload" accept="image/*">
                                        <button class="btn btn-outline-secondary" type="button" id="takeCategoryPhoto">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="image-preview-container mb-3">
                                    <div id="categoryImagePreview" class="image-preview">
                                        <div class="placeholder-text">No image selected</div>
                                    </div>
                                    <input type="hidden" id="categoryImageBase64">
                                </div>
                            </form>
                            
                            <div class="form-actions mt-3">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" id="saveCategoryBtn" class="btn btn-primary">
                                    <i class="fas fa-save me-2"></i>Save Category
                                </button>
                                <button type="button" id="deleteCategoryBtn" class="btn btn-danger d-none">
                                    <i class="fas fa-trash me-2"></i>Delete Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div class="modal fade" id="deleteCategoryConfirmModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Delete</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this category?</p>
                    <p class="text-danger">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" id="confirmDeleteCategoryBtn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bulk Delete Confirmation Modal -->
    <div class="modal fade" id="bulkDeleteConfirmModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">Confirm Bulk Delete</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete <span id="selectedCategoriesCount">0</span> selected categories?</p>
                    <p class="text-danger">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" id="confirmBulkDeleteBtn" class="btn btn-danger">Delete All Selected</button>
                </div>
            </div>
        </div>
    </div>`;
    
    // Create a temporary container to hold the modal
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    
    // Add the modal to the document body
    document.body.appendChild(tempDiv.firstElementChild);
    document.body.appendChild(tempDiv.children[0]);
    document.body.appendChild(tempDiv.children[0]);
    
    // Initialize modal references
    categoryModal = document.getElementById('categoryManagementModal');
    categoriesList = document.getElementById('categoriesList');
    categoryNameInput = document.getElementById('categoryName');
    categoryDescriptionInput = document.getElementById('categoryDescription');
    displayOrderInput = document.getElementById('displayOrder');
    isActiveInput = document.getElementById('isActive');
    categoryIdInput = document.getElementById('categoryFormId');
    imagePreviewElement = document.getElementById('categoryImagePreview');
    imageBase64Input = document.getElementById('categoryImageBase64');
    saveCategoryBtn = document.getElementById('saveCategoryBtn');
    
    // Set up event listeners
    setupCategoryModalEventListeners();
    
    // Fetch categories
    fetchCategories();
}

// Set up event listeners for the category modal
function setupCategoryModalEventListeners() {
    // Add new category button
    document.getElementById('addNewCategoryBtn').addEventListener('click', () => {
        resetCategoryForm();
        categoriesModalData.modalMode = 'add';
        document.getElementById('categoryModalLabel').textContent = 'Add New Category';
        saveCategoryBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Category';
        document.getElementById('deleteCategoryBtn').classList.add('d-none');
    });
    
    // Save button
    saveCategoryBtn.addEventListener('click', saveCategory);
    
    // Delete button
    document.getElementById('deleteCategoryBtn').addEventListener('click', () => {
        const categoryId = categoryIdInput.value;
        if (categoryId) {
            categoriesModalData.categoryToDelete = categoryId;
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryConfirmModal'));
            deleteModal.show();
        }
    });
    
    // Confirm delete button
    document.getElementById('confirmDeleteCategoryBtn').addEventListener('click', deleteCategory);
    
    // Image upload event handler
    document.getElementById('categoryImageUpload').addEventListener('change', handleCategoryImageUpload);
    
    // Take photo button
    document.getElementById('takeCategoryPhoto').addEventListener('click', () => {
        // TODO: Implement camera functionality if needed
        alert('Camera functionality will be implemented here');
    });
    
    // New search functionality
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterCategories);
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            document.getElementById('categorySearchInput').value = '';
            filterCategories();
        });
    }
    
    // Bulk action buttons
    const bulkActivateBtn = document.getElementById('bulkActivateBtn');
    if (bulkActivateBtn) {
        bulkActivateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateBulkStatus(true);
        });
    }
    
    const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
    if (bulkDeactivateBtn) {
        bulkDeactivateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateBulkStatus(false);
        });
    }
    
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showBulkDeleteConfirmation();
        });
    }
    
    // Confirm bulk delete button
    const confirmBulkDeleteBtn = document.getElementById('confirmBulkDeleteBtn');
    if (confirmBulkDeleteBtn) {
        confirmBulkDeleteBtn.addEventListener('click', bulkDeleteCategories);
    }
}

// Reset category form
function resetCategoryForm() {
    categoryNameInput.value = '';
    categoryDescriptionInput.value = '';
    displayOrderInput.value = '1';
    isActiveInput.value = 'true';
    categoryIdInput.value = '';
    imagePreviewElement.innerHTML = '<div class="placeholder-text">No image selected</div>';
    imageBase64Input.value = '';
    
    // Hide delete button for add mode
    document.getElementById('deleteCategoryBtn').classList.add('d-none');
    
    // Clear any validation states
    removeValidationState(categoryNameInput);
    removeValidationState(displayOrderInput);
}

// Populate form with category data
function populateCategoryForm(categoryId) {
    const category = categoriesModalData.categories.find(c => c.CATEGORY_ID.toString() === categoryId.toString());
    if (!category) {
        console.error('Category not found:', categoryId);
        return;
    }
    
    categoryNameInput.value = category.NAME || '';
    categoryDescriptionInput.value = category.DESCRIPTION || '';
    displayOrderInput.value = category.DISPLAY_ORDER || '1';
    isActiveInput.value = category.IS_ACTIVE ? 'true' : 'false';
    categoryIdInput.value = category.CATEGORY_ID;
    
    // Set image if available
    if (category.GROUP_IMGURL) {
        imageBase64Input.value = category.GROUP_IMGURL;
        imagePreviewElement.innerHTML = `<img src="${category.GROUP_IMGURL}" class="img-fluid" alt="Category Image">`;
    } else {
        imagePreviewElement.innerHTML = '<div class="placeholder-text">No image selected</div>';
        imageBase64Input.value = '';
    }
    
    // Show delete button for edit mode
    document.getElementById('deleteCategoryBtn').classList.remove('d-none');
}

// Fetch categories from the API
async function fetchCategories() {
    try {
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // Show loading state in the categories list
        categoriesList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Loading categories...</span></div>';
        
        const response = await fetch('/api/menu-categories', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Filter categories by the logged-in user's username
            const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
            const allCategories = data.data || [];
            categoriesModalData.categories = allCategories.filter(category => category.USERNAME === username);
            
            // Render the categories list
            renderCategoriesList();
        } else {
            throw new Error(data.message || 'Failed to load categories');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categoriesList.innerHTML = `<div class="alert alert-danger">Error loading categories: ${error.message}</div>`;
    }
}

// Render categories list
function renderCategoriesList() {
    if (!categoriesList) return;
    
    // Sort categories by display order
    const sortedCategories = [...categoriesModalData.categories].sort((a, b) => a.DISPLAY_ORDER - b.DISPLAY_ORDER);
    
    if (sortedCategories.length === 0) {
        categoriesList.innerHTML = '<div class="text-center py-3">No categories found</div>';
        return;
    }
    
    categoriesList.innerHTML = '';
    
    // Create an item for each category
    sortedCategories.forEach(category => {
        const listItem = document.createElement('a');
        listItem.className = 'list-group-item list-group-item-action d-flex align-items-center';
        listItem.href = '#';
        
        // Add selected class if in selected array
        if (categoriesModalData.selectedCategories.includes(category.CATEGORY_ID)) {
            listItem.classList.add('active');
        }
        
        // Add active/inactive status indicator
        const statusClass = category.IS_ACTIVE ? 'bg-success' : 'bg-danger';
        
        const imgUrl = category.GROUP_IMGURL || 'https://via.placeholder.com/40x40?text=No+Image';
        
        // Add checkbox for bulk selection
        listItem.innerHTML = `
            <div class="form-check me-2">
                <input class="form-check-input category-checkbox" type="checkbox" value="${category.CATEGORY_ID}" 
                    ${categoriesModalData.selectedCategories.includes(category.CATEGORY_ID) ? 'checked' : ''}>
            </div>
            <div class="category-image-small me-2" style="width: 40px; height: 40px; background-image: url('${imgUrl}'); 
                background-size: cover; background-position: center; border-radius: 4px;"></div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="fw-semibold">${category.NAME}</div>
                    <div class="status-indicator ${statusClass}" style="width: 8px; height: 8px; border-radius: 50%;"></div>
                </div>
                <div class="text-muted small">Order: ${category.DISPLAY_ORDER}</div>
            </div>
        `;
        
        // Add click event to edit the category
        listItem.addEventListener('click', (e) => {
            // Don't trigger edit if clicking on the checkbox
            if (e.target.type === 'checkbox') return;
            
            e.preventDefault();
            populateCategoryForm(category.CATEGORY_ID);
            categoriesModalData.modalMode = 'edit';
            document.getElementById('categoryModalLabel').textContent = 'Edit Category';
            saveCategoryBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Category';
            document.getElementById('deleteCategoryBtn').classList.remove('d-none');
        });
        
        // Add checkbox event listener
        const checkbox = listItem.querySelector('.category-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent item click event
                toggleCategorySelection(category.CATEGORY_ID, e.target.checked);
            });
        }
        
        categoriesList.appendChild(listItem);
    });
    
    // Update bulk actions availability based on selections
    updateBulkActionsState();
}

// Save category (add or edit)
async function saveCategory() {
    try {
        // Validate form before saving
        if (!validateCategoryForm()) {
            return;
        }
        
        // Disable save button and show loading state
        saveCategoryBtn.disabled = true;
        saveCategoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
        
        // Get username from session/local storage with proper fallbacks
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
        
        const categoryData = {
            NAME: categoryNameInput.value,
            DESCRIPTION: categoryDescriptionInput.value,
            DISPLAY_ORDER: parseInt(displayOrderInput.value) || 1,
            IS_ACTIVE: isActiveInput.value === 'true',
            GROUP_IMGURL: imageBase64Input.value || null,
            USERNAME: username, // Add username for filtering
            // Add both CREATED_BY and UPDATED_BY fields with username value
            CREATED_BY: username,
            UPDATED_BY: username
        };
        
        let url = '/api/menu-categories';
        let method = 'POST';
        
        if (categoriesModalData.modalMode === 'edit') {
            const categoryId = categoryIdInput.value;
            if (!categoryId) {
                throw new Error('Category ID is missing for update operation');
            }
            url = `/api/menu-categories/${categoryId}`;
            method = 'PUT';
            // For edit mode, we only need to set UPDATED_BY
            delete categoryData.CREATED_BY;
        }
        
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(categoryData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local data
            if (categoriesModalData.modalMode === 'add') {
                // Add new category to the array
                categoriesModalData.categories.push(data.data);
            } else {
                // Update existing category
                const index = categoriesModalData.categories.findIndex(c => c.CATEGORY_ID === parseInt(categoryIdInput.value));
                if (index !== -1) {
                    categoriesModalData.categories[index] = data.data;
                }
            }
            
            // Update UI
            renderCategoriesList();
            
            // Show success message using toast
            showToast('Success', `Category ${categoriesModalData.modalMode === 'add' ? 'added' : 'updated'} successfully`, 'success');
            
            // Reset form for add mode
            if (categoriesModalData.modalMode === 'add') {
                resetCategoryForm();
            }
            
            // Update the categories in the parent menu items page if it has a fetchCategories function
            if (typeof window.fetchCategories === 'function') {
                window.fetchCategories();
            }
        } else {
            showToast('Error', data.message || `Failed to ${categoriesModalData.modalMode} category`, 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('Error', `An error occurred: ${error.message}`, 'error');
    } finally {
        // Re-enable save button
        saveCategoryBtn.disabled = false;
        saveCategoryBtn.innerHTML = categoriesModalData.modalMode === 'add' 
            ? '<i class="fas fa-plus me-2"></i>Add Category'
            : '<i class="fas fa-save me-2"></i>Save Category';
    }
}

// Delete category
async function deleteCategory() {
    if (!categoriesModalData.categoryToDelete) return;
    
    const deleteBtn = document.getElementById('confirmDeleteCategoryBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
    
    try {
        // Get username from session/local storage with proper fallbacks
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // Use RPC endpoint instead of direct REST API for better compatibility
        const response = await fetch(`/api/supabase-rpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify({
                function_name: 'delete_menu_category',
                params: {
                    p_category_id: parseInt(categoriesModalData.categoryToDelete),
                    p_username: username
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove from local array
            categoriesModalData.categories = categoriesModalData.categories.filter(c => 
                c.CATEGORY_ID !== parseInt(categoriesModalData.categoryToDelete));
            
            // Also remove from selected categories if present
            categoriesModalData.selectedCategories = categoriesModalData.selectedCategories.filter(
                id => id !== parseInt(categoriesModalData.categoryToDelete)
            );
            
            // Update UI
            renderCategoriesList();
            resetCategoryForm();
            
            // Show success message
            showToast('Success', 'Category deleted successfully', 'success');
            
            // Hide delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryConfirmModal'));
            deleteModal.hide();
            
            // Update the categories in the parent menu items page if it has a fetchCategories function
            if (typeof window.fetchCategories === 'function') {
                window.fetchCategories();
            }
        } else {
            showToast('Error', data.message || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Error', `An error occurred: ${error.message}`, 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = 'Delete';
        categoriesModalData.categoryToDelete = null;
    }
}

// Handle image upload
function handleCategoryImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Error', 'Image size must be less than 5MB', 'error');
        return;
    }
    
    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
        showToast('Error', 'Only JPEG, PNG, GIF and WebP images are allowed', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'img-fluid';
        img.alt = 'Category Image';
        
        // Clear preview and add the new image
        imagePreviewElement.innerHTML = '';
        imagePreviewElement.appendChild(img);
        
        // Store base64 image
        imageBase64Input.value = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Show toast message
function showToast(title, message, type = 'info') {
    // Check if toast function exists in parent window
    if (typeof window.showToast === 'function') {
        window.showToast(title, message, type);
    } else {
        // If not, use alert as fallback
        alert(`${title}: ${message}`);
    }
}

// New function: Validate category form
function validateCategoryForm() {
    let isValid = true;
    
    // Validate category name (required, max length)
    if (!categoryNameInput.value.trim()) {
        setInvalid(categoryNameInput, 'Category name is required');
        isValid = false;
    } else if (categoryNameInput.value.length > 50) {
        setInvalid(categoryNameInput, 'Category name cannot exceed 50 characters');
        isValid = false;
    } else {
        setValid(categoryNameInput);
    }
    
    // Validate display order (required, positive number)
    const displayOrder = parseInt(displayOrderInput.value);
    if (isNaN(displayOrder) || displayOrder < 1) {
        setInvalid(displayOrderInput, 'Display order must be a positive number');
        isValid = false;
    } else {
        setValid(displayOrderInput);
    }
    
    return isValid;
}

// Helper function to set invalid state on input
function setInvalid(input, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    
    // Find or create feedback element
    let feedbackElement = document.getElementById(input.id + 'Feedback');
    if (feedbackElement) {
        feedbackElement.textContent = message;
    }
}

// Helper function to set valid state on input
function setValid(input) {
    input.classList.add('is-valid');
    input.classList.remove('is-invalid');
}

// Helper function to remove validation state
function removeValidationState(input) {
    input.classList.remove('is-valid', 'is-invalid');
}

// New function: Filter categories based on search input
function filterCategories() {
    const searchText = document.getElementById('categorySearchInput').value.toLowerCase().trim();
    
    if (!categoriesList) return;
    
    // Filter and render categories that match the search
    const allCategoryItems = categoriesList.querySelectorAll('.list-group-item');
    
    allCategoryItems.forEach(item => {
        const categoryName = item.querySelector('.fw-semibold').textContent.toLowerCase();
        if (categoryName.includes(searchText) || searchText === '') {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// New function: Toggle category selection for bulk operations
function toggleCategorySelection(categoryId, isSelected) {
    if (isSelected) {
        if (!categoriesModalData.selectedCategories.includes(categoryId)) {
            categoriesModalData.selectedCategories.push(categoryId);
        }
    } else {
        categoriesModalData.selectedCategories = categoriesModalData.selectedCategories.filter(id => id !== categoryId);
    }
    
    updateBulkActionsState();
}

// New function: Update bulk actions buttons state
function updateBulkActionsState() {
    const hasSelections = categoriesModalData.selectedCategories.length > 0;
    const bulkActionsButtons = document.querySelectorAll('#bulkActivateBtn, #bulkDeactivateBtn, #bulkDeleteBtn');
    
    bulkActionsButtons.forEach(button => {
        button.classList.toggle('disabled', !hasSelections);
    });
}

// New function: Show bulk delete confirmation
function showBulkDeleteConfirmation() {
    const selectedCount = categoriesModalData.selectedCategories.length;
    if (selectedCount === 0) return;
    
    // Update the count in the modal
    document.getElementById('selectedCategoriesCount').textContent = selectedCount;
    
    // Show the confirmation modal
    const bulkDeleteModal = new bootstrap.Modal(document.getElementById('bulkDeleteConfirmModal'));
    bulkDeleteModal.show();
}

// New function: Bulk delete categories
async function bulkDeleteCategories() {
    if (categoriesModalData.selectedCategories.length === 0) return;
    
    const deleteBtn = document.getElementById('confirmBulkDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
    
    try {
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // We'll use Promise.all to handle multiple delete requests
        const deletePromises = categoriesModalData.selectedCategories.map(categoryId => {
            return fetch(`/api/supabase-rpc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify({
                    function_name: 'delete_menu_category',
                    params: {
                        p_category_id: parseInt(categoryId),
                        p_username: username
                    }
                })
            }).then(response => response.json());
        });
        
        const results = await Promise.all(deletePromises);
        const failedCount = results.filter(result => !result.success).length;
        
        if (failedCount === 0) {
            // All deletions were successful
            
            // Update local data
            categoriesModalData.categories = categoriesModalData.categories.filter(
                category => !categoriesModalData.selectedCategories.includes(category.CATEGORY_ID)
            );
            
            // Clear selection array
            categoriesModalData.selectedCategories = [];
            
            // Update UI
            renderCategoriesList();
            resetCategoryForm();
            
            // Show success message
            showToast('Success', `${results.length} categories deleted successfully`, 'success');
            
            // Update parent page categories if needed
            if (typeof window.fetchCategories === 'function') {
                window.fetchCategories();
            }
        } else {
            // Some deletions failed
            showToast('Warning', `${results.length - failedCount} of ${results.length} categories deleted. Some categories may be in use.`, 'warning');
            
            // Refresh categories to get accurate state
            await fetchCategories();
        }
        
        // Hide the modal
        const bulkDeleteModal = bootstrap.Modal.getInstance(document.getElementById('bulkDeleteConfirmModal'));
        bulkDeleteModal.hide();
        
    } catch (error) {
        console.error('Error in bulk delete:', error);
        showToast('Error', `An error occurred: ${error.message}`, 'error');
    } finally {
        // Re-enable the button
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = 'Delete All Selected';
    }
}

// New function: Update bulk status (active/inactive)
async function updateBulkStatus(setActive) {
    if (categoriesModalData.selectedCategories.length === 0) return;
    
    // Disable bulk action buttons
    document.getElementById('bulkActivateBtn').classList.add('disabled');
    document.getElementById('bulkDeactivateBtn').classList.add('disabled');
    
    try {
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'unknown_user';
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // We'll use Promise.all to handle multiple update requests
        const updatePromises = categoriesModalData.selectedCategories.map(categoryId => {
            // Find the category to update
            const category = categoriesModalData.categories.find(c => c.CATEGORY_ID === categoryId);
            if (!category) return Promise.resolve({ success: false });
            
            // Prepare update data
            const updateData = {
                NAME: category.NAME,
                DESCRIPTION: category.DESCRIPTION,
                DISPLAY_ORDER: category.DISPLAY_ORDER,
                IS_ACTIVE: setActive,
                GROUP_IMGURL: category.GROUP_IMGURL,
                USERNAME: username,
                UPDATED_BY: username
            };
            
            return fetch(`/api/menu-categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(updateData)
            }).then(response => response.json());
        });
        
        const results = await Promise.all(updatePromises);
        const successfulUpdates = results.filter(result => result.success);
        
        if (successfulUpdates.length > 0) {
            // Update successful categories in local data
            results.forEach((result, index) => {
                if (result.success) {
                    const categoryId = categoriesModalData.selectedCategories[index];
                    const categoryIndex = categoriesModalData.categories.findIndex(c => c.CATEGORY_ID === categoryId);
                    if (categoryIndex !== -1) {
                        categoriesModalData.categories[categoryIndex].IS_ACTIVE = setActive;
                    }
                }
            });
            
            // Update UI
            renderCategoriesList();
            
            // Show success message
            showToast('Success', `${successfulUpdates.length} categories ${setActive ? 'activated' : 'deactivated'} successfully`, 'success');
            
            // Update parent page categories if needed
            if (typeof window.fetchCategories === 'function') {
                window.fetchCategories();
            }
        } else {
            showToast('Error', 'Failed to update categories', 'error');
        }
        
    } catch (error) {
        console.error('Error in bulk status update:', error);
        showToast('Error', `An error occurred: ${error.message}`, 'error');
    } finally {
        // Re-enable bulk action buttons
        document.getElementById('bulkActivateBtn').classList.remove('disabled');
        document.getElementById('bulkDeactivateBtn').classList.remove('disabled');
    }
}