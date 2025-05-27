/**
 * Cloudinary operations helper functions
 * This file handles all Cloudinary-related operations for the FoodBao admin interface
 * Last updated: April 20, 2025
 */

// Get Cloudinary credentials for the current user
async function getCloudinaryCredentials(username) {
    try {
        // Add authentication token
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        console.log('Fetching Cloudinary credentials for user:', username);
        
        const response = await fetch('/api/cloudinary-credentials', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error fetching Cloudinary credentials:', response.status, errorText);
            throw new Error(`Failed to fetch Cloudinary credentials: ${response.status}`);
        }
        
        const credentials = await response.json();
        console.log('Credentials received:', credentials);
        
        if (!credentials || !credentials.cloud_name || !credentials.upload_preset) {
            console.error('Invalid Cloudinary credentials received:', credentials);
            throw new Error('Invalid Cloudinary credentials');
        }
        
        return credentials;
    } catch (error) {
        console.error('Error in getCloudinaryCredentials:', error);
        throw error;
    }
}

// Upload a file to Cloudinary
async function uploadToCloudinary(file, cloudName, uploadPreset) {
    if (!file) {
        console.error('Missing file parameter for Cloudinary upload');
        throw new Error('Missing file parameter for Cloudinary upload');
    }
    
    if (!cloudName || !uploadPreset) {
        console.error('Missing Cloudinary configuration parameters', {cloudName, uploadPreset});
        
        // Try to get credentials from the window object if available
        try {
            if (window.CLOUDINARY_CONFIG && window.CLOUDINARY_CONFIG.cloud_name && window.CLOUDINARY_CONFIG.upload_preset) {
                cloudName = window.CLOUDINARY_CONFIG.cloud_name;
                uploadPreset = window.CLOUDINARY_CONFIG.upload_preset;
                console.log('Retrieved Cloudinary config from window object');
            } else {
                // Get username from session/local storage
                const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'admin';
                // Try to get credentials dynamically
                const credentials = await getCloudinaryCredentials(username);
                cloudName = credentials.cloud_name;
                uploadPreset = credentials.upload_preset;
                console.log('Retrieved Cloudinary config dynamically');
            }
        } catch (error) {
            console.error('Failed to retrieve Cloudinary configuration:', error);
            throw new Error('Failed to retrieve Cloudinary configuration: ' + error.message);
        }
        
        if (!cloudName || !uploadPreset) {
            throw new Error('Missing required parameters for Cloudinary upload');
        }
    }
    
    console.log('Uploading to Cloudinary with cloud_name:', cloudName);
    console.log('Using upload_preset:', uploadPreset);
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    try {
        console.log('Sending upload request to Cloudinary');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Cloudinary upload error response:', errorData);
            throw new Error(`Cloudinary upload failed: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Cloudinary upload successful:', data);
        
        // Return the secure URL of the uploaded image
        return data.secure_url;
    } catch (error) {
        console.error('Error in uploadToCloudinary:', error);
        throw new Error(`Cloudinary upload error: ${error.message}`);
    }
}

// Capture an image from the camera and upload to Cloudinary
async function captureAndUploadImage(videoElement, previewElement, imageBase64Input) {
    // Safety checks with meaningful error messages
    if (!videoElement) {
        console.error('[captureAndUploadImage] Missing video element');
        return {
            success: false,
            error: new Error('Missing video element'),
            message: 'Could not capture image: Video element not found'
        };
    }
    
    if (!previewElement) {
        console.error('[captureAndUploadImage] Missing preview element');
        return {
            success: false,
            error: new Error('Missing preview element'),
            message: 'Could not capture image: Preview element not found'
        };
    }
    
    if (!imageBase64Input) {
        console.error('[captureAndUploadImage] Missing image input element');
        return {
            success: false,
            error: new Error('Missing image input element'),
            message: 'Could not capture image: Image input element not found'
        };
    }

    // Find the actual DOM elements if string IDs were passed instead of elements
    if (typeof videoElement === 'string') {
        videoElement = document.getElementById(videoElement);
        if (!videoElement) {
            return {
                success: false,
                error: new Error('Video element not found with ID: ' + videoElement),
                message: 'Could not capture image: Video element not found'
            };
        }
    }
    
    if (typeof previewElement === 'string') {
        previewElement = document.getElementById(previewElement);
        if (!previewElement) {
            return {
                success: false,
                error: new Error('Preview element not found with ID: ' + previewElement),
                message: 'Could not capture image: Preview element not found'
            };
        }
    }
    
    if (typeof imageBase64Input === 'string') {
        imageBase64Input = document.getElementById(imageBase64Input);
        if (!imageBase64Input) {
            return {
                success: false,
                error: new Error('Image input element not found with ID: ' + imageBase64Input),
                message: 'Could not capture image: Image input element not found'
            };
        }
    }
    
    try {
        // Create a canvas element to capture the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        // Draw the current video frame to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a data URL (base64 encoded image)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Show loading indicator in the preview area
        previewElement.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Uploading...</span>
                </div>
                <span class="ms-2">Uploading image...</span>
            </div>
        `;
        
        // Convert base64 to blob
        const blob = await fetch(imageDataUrl).then(res => res.blob());
        
        // Get username from session/local storage
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'admin';
        
        try {
            // Get Cloudinary credentials
            const credentials = await getCloudinaryCredentials(username);
            
            // Upload to Cloudinary
            const cloudinaryUrl = await uploadToCloudinary(
                blob,
                credentials.cloud_name,
                credentials.upload_preset
            );
            
            // Update the preview element with the uploaded image
            previewElement.innerHTML = `<img src="${cloudinaryUrl}" alt="Uploaded Image">`;
            
            // Set the hidden input value to the Cloudinary URL
            imageBase64Input.value = cloudinaryUrl;
            
            return {
                success: true,
                url: cloudinaryUrl,
                message: 'Image uploaded successfully!'
            };
        } catch (cloudinaryError) {
            console.error('Cloudinary upload failed:', cloudinaryError);
            
            // Fallback to using the local base64 image
            console.log('Falling back to local image');
            previewElement.innerHTML = `<img src="${imageDataUrl}" alt="Local Image">`;
            imageBase64Input.value = imageDataUrl;
            
            return {
                success: true, // Still return success with the local image
                url: imageDataUrl,
                message: 'Image saved locally (Cloudinary upload failed)'
            };
        }
    } catch (error) {
        console.error('Error in captureAndUploadImage:', error);
        
        // Return error information
        return {
            success: false,
            error: error,
            message: 'Failed to capture image: ' + error.message
        };
    }
}

// Upload a file from an input element to Cloudinary
async function uploadFileToCloudinary(fileInput, previewElement, imageBase64Input) {
    // Safety checks with meaningful error messages
    if (!fileInput) {
        console.error('[uploadFileToCloudinary] Missing file input element');
        return {
            success: false,
            error: new Error('Missing file input element'),
            message: 'Could not upload: File input element not found'
        };
    }
    
    if (!previewElement) {
        console.error('[uploadFileToCloudinary] Missing preview element');
        return {
            success: false,
            error: new Error('Missing preview element'),
            message: 'Could not upload: Preview element not found'
        };
    }
    
    if (!imageBase64Input) {
        console.error('[uploadFileToCloudinary] Missing image input element');
        return {
            success: false,
            error: new Error('Missing image input element'),
            message: 'Could not upload: Image input element not found'
        };
    }

    // Find the actual DOM elements if string IDs were passed
    if (typeof fileInput === 'string') {
        fileInput = document.getElementById(fileInput);
        if (!fileInput) {
            return {
                success: false,
                error: new Error('File input element not found with ID: ' + fileInput),
                message: 'Could not upload: File input element not found'
            };
        }
    }
    
    if (typeof previewElement === 'string') {
        previewElement = document.getElementById(previewElement);
        if (!previewElement) {
            return {
                success: false,
                error: new Error('Preview element not found with ID: ' + previewElement),
                message: 'Could not upload: Preview element not found'
            };
        }
    }
    
    if (typeof imageBase64Input === 'string') {
        imageBase64Input = document.getElementById(imageBase64Input);
        if (!imageBase64Input) {
            return {
                success: false,
                error: new Error('Image input element not found with ID: ' + imageBase64Input),
                message: 'Could not upload: Image input element not found'
            };
        }
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
        console.error('No file selected for upload');
        return {
            success: false,
            error: new Error('No file selected'),
            message: 'No file selected for upload'
        };
    }
    
    try {
        const file = fileInput.files[0];
        
        // Show loading indicator in the preview area
        previewElement.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Uploading...</span>
                </div>
                <span class="ms-2">Uploading image...</span>
            </div>
        `;
        
        // Get username from session/local storage
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'admin';
        
        try {
            // Get Cloudinary credentials
            const credentials = await getCloudinaryCredentials(username);
            
            // Upload to Cloudinary
            const cloudinaryUrl = await uploadToCloudinary(
                file,
                credentials.cloud_name,
                credentials.upload_preset
            );
            
            // Update the preview image with the Cloudinary URL
            previewElement.innerHTML = `<img src="${cloudinaryUrl}" alt="Uploaded Image">`;
            
            // Set the hidden input value to the Cloudinary URL
            imageBase64Input.value = cloudinaryUrl;
            
            return {
                success: true,
                url: cloudinaryUrl,
                message: 'Image uploaded successfully!'
            };
        } catch (cloudinaryError) {
            console.error('Cloudinary upload failed:', cloudinaryError);
            
            // Fallback to using the local file reader
            console.log('Falling back to local image');
            const reader = new FileReader();
            
            return new Promise((resolve) => {
                reader.onload = function(event) {
                    previewElement.innerHTML = `<img src="${event.target.result}" alt="Local Image">`;
                    imageBase64Input.value = event.target.result;
                    resolve({
                        success: true,
                        url: event.target.result,
                        message: 'Image saved locally (Cloudinary upload failed)'
                    });
                };
                reader.readAsDataURL(file);
            });
        }
    } catch (error) {
        console.error('Error uploading file to Cloudinary:', error);
        
        // Return error information
        return {
            success: false,
            error: error,
            message: 'Failed to upload image: ' + error.message
        };
    }
}

// A global configuration object that can be used to store Cloudinary credentials
window.CLOUDINARY_CONFIG = window.CLOUDINARY_CONFIG || {};

// Export these functions for use in other files
window.getCloudinaryCredentials = getCloudinaryCredentials;
window.uploadToCloudinary = uploadToCloudinary;
window.captureAndUploadImage = captureAndUploadImage;
window.uploadFileToCloudinary = uploadFileToCloudinary;