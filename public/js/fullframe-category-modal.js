// Global variables for camera and stream
let fullFrameCameraStream = null;
let fullFrameImageCapture = null;
let fullFrameCloudinaryUploadUrl = null;

// Open the full frame category modal
function openFullFrameCategoryModal(mode, data = null) {
    const modal = document.getElementById('fullFrameCategoryModal');
    const title = document.getElementById('fullFrameCategoryTitle');
    const saveBtn = document.getElementById('saveFullFrameCategory');
    const form = document.getElementById('fullFrameCategoryForm');
    
    // Reset form
    form.reset();
    document.getElementById('fullFrameImageBase64').value = '';
    document.getElementById('fullFrameImagePreview').innerHTML = `
        <div class="image-preview-placeholder">
            <i class="fas fa-image fa-3x mb-2"></i>
            <p>No image selected</p>
        </div>
    `;
    
    if (mode === 'add') {
        title.textContent = 'Add New Category';
        saveBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Category';
        document.getElementById('fullFrameCategoryId').value = '';
        document.getElementById('fullFrameDisplayOrder').value = '1';
        document.getElementById('fullFrameIsActive').value = 'true';
    } else if (mode === 'edit' && data) {
        title.textContent = 'Edit Category';
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Category';
        
        // Fill form with data
        document.getElementById('fullFrameCategoryId').value = data.id;
        document.getElementById('fullFrameCategoryName').value = data.name;
        document.getElementById('fullFrameCategoryDescription').value = data.description || '';
        document.getElementById('fullFrameDisplayOrder').value = data.display_order || '1';
        document.getElementById('fullFrameIsActive').value = data.is_active.toString();
        
        // Show image if available
        if (data.image_url) {
            document.getElementById('fullFrameImagePreview').innerHTML = `
                <img src="${data.image_url}" alt="${data.name}" class="img-fluid rounded" style="max-height: 200px;">
            `;
        }
    }
    
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

// Close the full frame category modal
function closeFullFrameCategoryModal() {
    const modal = document.getElementById('fullFrameCategoryModal');
    stopFullFrameCamera();
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
}

// Activate camera for image capture
function activateFullFrameCamera() {
    const video = document.getElementById('fullFrameCameraCapture');
    const cameraBtns = document.getElementById('fullFrameCameraBtns');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                fullFrameCameraStream = stream;
                video.style.display = 'block';
                cameraBtns.classList.remove('d-none');
                
                // Create ImageCapture object
                const track = stream.getVideoTracks()[0];
                fullFrameImageCapture = new ImageCapture(track);
            })
            .catch(error => {
                console.error('Camera error:', error);
                showToast('Camera access denied or not available', 'error');
            });
    } else {
        showToast('Camera not supported on this device', 'error');
    }
}

// Stop camera stream
function stopFullFrameCamera() {
    const video = document.getElementById('fullFrameCameraCapture');
    const cameraBtns = document.getElementById('fullFrameCameraBtns');
    
    if (fullFrameCameraStream) {
        fullFrameCameraStream.getTracks().forEach(track => track.stop());
        fullFrameCameraStream = null;
    }
    
    video.style.display = 'none';
    cameraBtns.classList.add('d-none');
}

// Capture image from camera
function captureFullFrameImage() {
    if (!fullFrameImageCapture) return;
    
    fullFrameImageCapture.takePhoto()
        .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                document.getElementById('fullFrameImageBase64').value = base64data;
                
                // Update image preview
                document.getElementById('fullFrameImagePreview').innerHTML = `
                    <img src="${base64data}" alt="Category Image" class="img-fluid rounded" style="max-height: 200px;">
                `;
                
                // Stop camera after capture
                stopFullFrameCamera();
            };
            reader.readAsDataURL(blob);
        })
        .catch(error => {
            console.error('Error capturing image:', error);
            showToast('Failed to capture image', 'error');
        });
}

// Upload image to Cloudinary and save category data
async function uploadFullFrameImageToCloudinary() {
    const base64Image = document.getElementById('fullFrameImageBase64').value;
    
    if (!base64Image || base64Image.trim() === '') {
        return null; // No image to upload
    }
    
    try {
        // Get Cloudinary credentials
        const credentialsResponse = await fetch('/api/cloudinary-credentials');
        if (!credentialsResponse.ok) throw new Error('Failed to get Cloudinary credentials');
        
        const credentials = await credentialsResponse.json();
        
        // Prepare form data for Cloudinary upload
        const formData = new FormData();
        formData.append('file', base64Image);
        formData.append('upload_preset', credentials.upload_preset);
        
        // Upload to Cloudinary
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to upload image to Cloudinary');
        
        const uploadResult = await uploadResponse.json();
        return uploadResult.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        showToast('Failed to upload image', 'error');
        return null;
    }
}

// Save category data
async function saveFullFrameCategoryData() {
    const form = document.getElementById('fullFrameCategoryForm');
    
    // Form validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveFullFrameCategory');
    const originalBtnContent = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    
    try {
        // Upload image if there is one
        const imageUrl = await uploadFullFrameImageToCloudinary();
        
        // Get category data
        const categoryId = document.getElementById('fullFrameCategoryId').value;
        const categoryData = {
            name: document.getElementById('fullFrameCategoryName').value,
            description: document.getElementById('fullFrameCategoryDescription').value,
            display_order: parseInt(document.getElementById('fullFrameDisplayOrder').value),
            is_active: document.getElementById('fullFrameIsActive').value === 'true'
        };
        
        // Add image URL if available
        if (imageUrl) {
            categoryData.image_url = imageUrl;
        }
        
        // API endpoint and method
        let apiUrl = '/api/menu-categories';
        let method = 'POST';
        
        // If editing existing category
        if (categoryId && categoryId !== '') {
            apiUrl += `/${categoryId}`;
            method = 'PUT';
        }
        
        // Save category
        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save category: ${response.statusText}`);
        }
        
        // Success
        const result = await response.json();
        showToast(categoryId ? 'Category updated successfully' : 'Category added successfully', 'success');
        
        // Close modal and reload categories
        closeFullFrameCategoryModal();
        loadCategories(); // Assuming this function exists to reload the list
        
    } catch (error) {
        console.error('Error saving category:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnContent;
    }
}