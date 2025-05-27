// Category Management Functions
let categoryModalMode = 'new'; // 'new' or 'edit'
let categoryToDelete = null; // Store the ID of the category to be deleted

// Function to open category modal
function openCategoryModal(mode, categoryId = null) {
  categoryModalMode = mode;
  
  // Reset form
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  
  // Show/hide delete button based on mode
  const deleteBtn = document.getElementById('deleteCategoryBtn');
  if (deleteBtn) {
    deleteBtn.style.display = mode === 'edit' ? 'block' : 'none';
  }
  
  if (mode === 'new') {
    document.getElementById('categoryManagementModalLabel').textContent = 'Add New Category';
  } else if (mode === 'edit') {
    document.getElementById('categoryManagementModalLabel').textContent = 'Edit Category';
    
    // Get the selected category ID from the dropdown
    const categorySelect = document.getElementById('itemCategory');
    const selectedCategoryId = categorySelect.value;
    
    if (!selectedCategoryId || selectedCategoryId === '') {
      showToast('Please select a category to edit', 'warning');
      return;
    }
    
    // Fetch the category details and populate the form
    fetchCategoryDetails(selectedCategoryId);
  }
  
  // Open the modal
  const categoryModal = new bootstrap.Modal(document.getElementById('categoryManagementModal'));
  categoryModal.show();
}

// Function to fetch category details for editing
async function fetchCategoryDetails(categoryId) {
  try {
    showLoader('Loading category details...');
    
    const response = await fetch(`/api/menu-categories/${categoryId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching category: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const category = result.data;
      
      // Populate form fields
      document.getElementById('categoryId').value = category.CATEGORY_ID;
      document.getElementById('categoryName').value = category.NAME || '';
      document.getElementById('categoryDescription').value = category.DESCRIPTION || '';
      document.getElementById('categorySequence').value = category.DISPLAY_ORDER || 10;
      document.getElementById('categoryActive').checked = category.IS_ACTIVE !== false; // Default to true if undefined
    } else {
      throw new Error(result.message || 'Failed to fetch category details');
    }
  } catch (error) {
    console.error('Error fetching category details:', error);
    showToast(error.message, 'error');
  } finally {
    hideLoader();
  }
}

// Function to save category (create or update)
async function saveCategory() {
  try {
    const form = document.getElementById('categoryForm');
    
    // Basic validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    showLoader('Saving category...');
    
    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
      NAME: document.getElementById('categoryName').value,
      DESCRIPTION: document.getElementById('categoryDescription').value,
      DISPLAY_ORDER: parseInt(document.getElementById('categorySequence').value) || 10,
      IS_ACTIVE: document.getElementById('categoryActive').checked,
      UPDATED_BY: getCurrentUsername()
    };
    
    let url = '/api/menu-categories';
    let method = 'POST';
    
    // If editing, update instead of create
    if (categoryModalMode === 'edit' && categoryId) {
      url = `/api/menu-categories/${categoryId}`;
      method = 'PUT';
    } else {
      // For new categories, add created_by
      categoryData.CREATED_BY = getCurrentUsername();
    }
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(categoryData)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Error saving category: ${response.status}`);
    }
    
    // Success handling
    showToast(categoryModalMode === 'new' ? 'Category created successfully' : 'Category updated successfully', 'success');
    
    // Close the modal
    const categoryModal = bootstrap.Modal.getInstance(document.getElementById('categoryManagementModal'));
    if (categoryModal) {
      categoryModal.hide();
    }
    
    // Refresh categories dropdown
    await loadCategories();
    
    // Select the newly created or updated category
    if (result.data && result.data.CATEGORY_ID) {
      const categorySelect = document.getElementById('itemCategory');
      categorySelect.value = result.data.CATEGORY_ID;
    }
    
  } catch (error) {
    console.error('Error saving category:', error);
    showToast(error.message, 'error');
  } finally {
    hideLoader();
  }
}

// Function to confirm category deletion
function confirmDeleteCategory() {
  const categoryId = document.getElementById('categoryId').value;
  const categoryName = document.getElementById('categoryName').value;
  
  if (!categoryId) {
    showToast('No category selected for deletion', 'warning');
    return;
  }
  
  // Store the ID for use in the delete operation
  categoryToDelete = categoryId;
  
  // Hide the category management modal and show the confirmation modal
  const categoryModal = bootstrap.Modal.getInstance(document.getElementById('categoryManagementModal'));
  if (categoryModal) {
    categoryModal.hide();
  }
  
  // Add the category name to the confirmation message
  const confirmMessage = document.querySelector('#deleteCategoryConfirmModal .modal-body p:first-child');
  if (confirmMessage) {
    confirmMessage.textContent = `Are you sure you want to delete the category "${categoryName}"?`;
  }
  
  // Show confirmation modal
  const confirmModal = new bootstrap.Modal(document.getElementById('deleteCategoryConfirmModal'));
  confirmModal.show();
}

// Function to delete a category
async function deleteCategory() {
  if (!categoryToDelete) {
    showToast('No category selected for deletion', 'error');
    return;
  }
  
  try {
    showLoader('Deleting category...');
    
    const response = await fetch(`/api/menu-categories/${categoryToDelete}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Error deleting category: ${response.status}`);
    }
    
    // Success handling
    showToast('Category deleted successfully', 'success');
    
    // Close the confirmation modal
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryConfirmModal'));
    if (confirmModal) {
      confirmModal.hide();
    }
    
    // Reset the category to delete
    categoryToDelete = null;
    
    // Refresh categories dropdown
    await loadCategories();
    
  } catch (error) {
    console.error('Error deleting category:', error);
    showToast(error.message, 'error');
    
    // If the category is in use, show a more descriptive message
    if (error.message.includes('being used by')) {
      showToast('Cannot delete this category because it is being used by one or more menu items. Remove all items from this category first.', 'warning');
    }
  } finally {
    hideLoader();
  }
}

// Helper function to get the current username
function getCurrentUsername() {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.username : 'system';
}

// Initialize category management event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add event listener to the save category button
  const saveCategoryBtn = document.getElementById('saveCategoryBtn');
  if (saveCategoryBtn) {
    saveCategoryBtn.addEventListener('click', saveCategory);
  }
  
  // Add event listener to the delete category button
  const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
  if (deleteCategoryBtn) {
    deleteCategoryBtn.addEventListener('click', confirmDeleteCategory);
  }
  
  // Add event listener to the confirm delete button
  const confirmDeleteBtn = document.getElementById('confirmDeleteCategoryBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', deleteCategory);
  }
});