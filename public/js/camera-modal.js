/**
 * Camera Modal - A reusable camera capture component
 * This script provides a fullscreen camera modal that can be used in any page
 * to capture photos and upload them to Cloudinary.
 */

// Camera Modal Variables
let cameraModalStream = null;
let cameraModalContext = null; // To track which form element is calling the camera
let cameraFacingMode = 'environment'; // Default to rear camera

// Initialize the camera modal
function initializeCameraModal() {
    // Create the camera modal HTML if it doesn't exist
    if (!document.getElementById('fullScreenCameraModal')) {
        createCameraModalHTML();
    }
    
    // Setup event listeners
    setupCameraModalEventListeners();
}

// Create the camera modal HTML structure
function createCameraModalHTML() {
    const modalHTML = `
    <div id="fullScreenCameraModal" class="fullscreen-camera-overlay" style="display: none; z-index: 3000;">
        <div class="camera-header" style="background-color: rgba(0,0,0,0.7); padding: 15px; display: flex; justify-content: space-between; align-items: center; position: absolute; top: 0; left: 0; right: 0; z-index: 3001;">
            <h5 style="color: white; margin: 0;">Take Photo</h5>
            <button type="button" class="close-camera-btn" id="closeFullScreenCamera" style="background: rgba(255,255,255,0.3); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <video id="fullScreenCameraView" class="fullscreen-camera" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; background-color: #000;"></video>
        <div id="cameraControlsContainer" class="camera-controls" style="position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 20px; z-index: 3001;">
            <button type="button" id="cameraSwitchBtn" class="flip-camera-btn" style="position: absolute; left: 20px; bottom: 35px;">
                <i class="fas fa-sync-alt"></i>
            </button>
            <button type="button" id="fullScreenCaptureBtn" class="capture-btn">
                <i class="fas fa-camera fa-2x"></i>
            </button>
        </div>
        
        <!-- Hidden canvas for capturing images -->
        <canvas id="fullScreenCaptureCanvas" style="display: none;"></canvas>
    </div>
    `;
    
    // Add camera modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Add the required CSS if not already present
    if (!document.getElementById('camerModalStyles')) {
        const style = document.createElement('style');
        style.id = 'camerModalStyles';
        style.textContent = `
            .fullscreen-camera-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #000;
                z-index: 3000;
            }
            
            .capture-btn {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background-color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            
            .flip-camera-btn {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background-color: rgba(255,255,255,0.3);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            
            @keyframes flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            .camera-flash {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: white;
                opacity: 0;
                z-index: 3002;
            }
            
            .flash-animation {
                animation: flash 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
}

// Setup event listeners for the camera modal
function setupCameraModalEventListeners() {
    // Close button
    document.getElementById('closeFullScreenCamera').addEventListener('click', closeCameraModal);
    
    // Capture button
    document.getElementById('fullScreenCaptureBtn').addEventListener('click', captureModalImage);
    
    // Camera switch button
    document.getElementById('cameraSwitchBtn').addEventListener('click', switchCameraFacing);
}

// Open the camera modal
function openCameraModal(contextId, previewElementId, valueElementId) {
    // Store context information - which elements will receive the captured image
    cameraModalContext = {
        id: contextId,
        previewId: previewElementId,
        valueId: valueElementId
    };

    // Clean up any existing loading indicators
    const existingIndicators = document.querySelectorAll('#initialCameraLoadingIndicator, #cameraLoadingIndicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Show the camera modal first
    document.getElementById('fullScreenCameraModal').style.display = 'block';
    
    // Add loading indicator directly to the modal with a unique ID
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'initialCameraLoadingIndicator';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.zIndex = '3002';
    loadingIndicator.innerHTML = `
        <div class="spinner-border text-light mb-2" role="status"></div>
        <div>Initializing camera...</div>
    `;
    document.getElementById('fullScreenCameraModal').appendChild(loadingIndicator);
    
    // Start the camera after a short delay to ensure modal is visible
    setTimeout(() => {
        startCameraStream();
    }, 300);
}

// Close the camera modal
function closeCameraModal() {
    // Stop camera stream if active
    if (cameraModalStream) {
        cameraModalStream.getTracks().forEach(track => track.stop());
        cameraModalStream = null;
    }
    
    // Hide the modal
    document.getElementById('fullScreenCameraModal').style.display = 'none';
    
    // Reset context
    cameraModalContext = null;
}

// Start the camera stream
function startCameraStream() {
    // Clean up any existing loading indicators first
    const existingLoadingIndicators = document.querySelectorAll('#cameraLoadingIndicator, #initialCameraLoadingIndicator');
    existingLoadingIndicators.forEach(indicator => {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    });
    
    // Add new loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'cameraLoadingIndicator';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.zIndex = '3002';
    loadingIndicator.innerHTML = `
        <div class="spinner-border text-light mb-2" role="status"></div>
        <div>Initializing camera...</div>
    `;
    document.getElementById('fullScreenCameraModal').appendChild(loadingIndicator);
    
    // Stop any existing stream
    if (cameraModalStream) {
        cameraModalStream.getTracks().forEach(track => track.stop());
        cameraModalStream = null;
    }
    
    // Optimize camera constraints based on facing mode
    const constraints = {
        video: {
            facingMode: cameraFacingMode,
            width: { ideal: cameraFacingMode === 'user' ? 1280 : 1920 }, // Lower resolution for front camera
            height: { ideal: cameraFacingMode === 'user' ? 720 : 1080 },
            frameRate: { ideal: cameraFacingMode === 'user' ? 24 : 30 } // Lower framerate for front camera
        },
        audio: false
    };
    
    // Add advanced constraints for better performance
    if (cameraFacingMode === 'user') {
        // Optimizations for front camera to reduce lag
        constraints.video.advanced = [
            { zoom: 1 }, // No zoom for front camera
            { exposureMode: "auto" },
            { focusMode: "continuous" }
        ];
    }
    
    // Access device camera with timeout to prevent hanging
    const cameraPromise = navigator.mediaDevices.getUserMedia(constraints);
    
    // Add a timeout to abort if taking too long
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Camera access timeout')), 8000);
    });
    
    // Race between camera access and timeout
    Promise.race([cameraPromise, timeoutPromise])
        .then(function(mediaStream) {
            // Remove all loading indicators
            document.querySelectorAll('#cameraLoadingIndicator, #initialCameraLoadingIndicator').forEach(indicator => {
                if (indicator && indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });
            
            cameraModalStream = mediaStream;
            const videoElement = document.getElementById('fullScreenCameraView');
            videoElement.srcObject = mediaStream;
            
            // Force hardware acceleration if available
            videoElement.style.transform = 'translateZ(0)';
            videoElement.style.webkitTransform = 'translateZ(0)';
            
            // Play video with a success and error handler
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log('Camera playback started successfully'))
                    .catch(error => {
                        console.error('Error playing camera stream:', error);
                        // Try an alternative method if initial play fails
                        setTimeout(() => videoElement.play(), 500);
                    });
            }
        })
        .catch(function(err) {
            // Remove all loading indicators
            document.querySelectorAll('#cameraLoadingIndicator, #initialCameraLoadingIndicator').forEach(indicator => {
                if (indicator && indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });
            
            console.error('Error accessing camera:', err);
            showCameraError('Unable to access camera: ' + err.message);
            closeCameraModal();
        });
}

// Switch between front and rear cameras
function switchCameraFacing() {
    // Toggle the facingMode
    cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    
    // Update UI to reflect camera change
    if (cameraFacingMode === 'user') {
        document.getElementById('fullScreenCameraView').classList.add('front-camera');
        document.getElementById('cameraSwitchBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Rear';
    } else {
        document.getElementById('fullScreenCameraView').classList.remove('front-camera');
        document.getElementById('cameraSwitchBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Front';
    }
    
    // Restart camera with new facing mode
    startCameraStream();
}

// Capture an image from the camera
async function captureModalImage() {
    if (!cameraModalStream) return;
    
    try {
        // Display a flash effect
        const flashElement = document.createElement('div');
        flashElement.className = 'camera-flash';
        document.getElementById('fullScreenCameraModal').appendChild(flashElement);
        
        // Add class to trigger the animation
        setTimeout(() => {
            flashElement.classList.add('flash-animation');
            setTimeout(() => {
                if (flashElement.parentNode) {
                    flashElement.parentNode.removeChild(flashElement);
                }
            }, 300);
        }, 0);
        
        // Set canvas dimensions to match video but ensure correct orientation
        const canvas = document.getElementById('fullScreenCaptureCanvas');
        const videoElement = document.getElementById('fullScreenCameraView');
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        
        // Get device orientation to handle portrait/landscape properly
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Configure canvas for better portrait photos
        if (isPortrait) {
            // For portrait mode, set proper portrait dimensions
            canvas.width = videoWidth;
            canvas.height = videoHeight;
        } else {
            // For landscape, use original dimensions
            canvas.width = videoWidth;
            canvas.height = videoHeight;
        }
        
        // Draw the current video frame to the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply any needed transformations for device orientation
        if (cameraFacingMode === 'user') {
            // Mirror the image for front-facing camera
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        // Draw the video frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // If context is available, update the target elements
        if (cameraModalContext && cameraModalContext.previewId && cameraModalContext.valueId) {
            try {
                // Get target elements
                const previewElement = document.getElementById(cameraModalContext.previewId);
                const valueElement = document.getElementById(cameraModalContext.valueId);
                
                if (!previewElement || !valueElement) {
                    throw new Error('Target elements not found');
                }
                
                // Try to upload to Cloudinary if available
                try {
                    // Get username from session/local storage
                    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'admin';
                    
                    // Check if Cloudinary functions are available
                    if (typeof getCloudinaryCredentials === 'function' && typeof uploadToCloudinary === 'function') {
                        // Convert data URL to blob
                        const blob = dataURLtoBlob(imageDataUrl);
                        
                        // Get Cloudinary credentials
                        const credentials = await getCloudinaryCredentials(username);
                        
                        // Upload to Cloudinary
                        const cloudinaryUrl = await uploadToCloudinary(
                            blob, 
                            credentials.cloud_name, 
                            credentials.upload_preset
                        );
                        
                        // Update preview and value
                        updatePreviewElement(previewElement, cloudinaryUrl);
                        valueElement.value = cloudinaryUrl;
                        
                        // Show success message if showSuccess function is available
                        if (typeof showSuccess === 'function') {
                            showSuccess('Image captured and uploaded successfully!');
                        }
                    } else {
                        // Cloudinary functions not available, use local image
                        updatePreviewElement(previewElement, imageDataUrl);
                        valueElement.value = imageDataUrl;
                    }
                } catch (uploadError) {
                    console.error('Error uploading to Cloudinary:', uploadError);
                    
                    // Show toast message if available
                    if (typeof showToast === 'function') {
                        showToast('Using local image instead of cloud storage', false);
                    }
                    
                    // Fall back to using the data URL directly
                    updatePreviewElement(previewElement, imageDataUrl);
                    valueElement.value = imageDataUrl;
                }
            } catch (error) {
                console.error('Error updating elements with captured image:', error);
                showCameraError('Error updating image: ' + error.message);
            }
        }
        
        // Hide the camera modal with a slight delay
        setTimeout(() => {
            closeCameraModal();
        }, 300);
    } catch (error) {
        console.error('Error capturing image:', error);
        showCameraError('Failed to capture image: ' + error.message);
    }
}

// Update the preview element with the captured image
function updatePreviewElement(previewElement, imageUrl) {
    // If the preview is an image element
    if (previewElement.tagName === 'IMG') {
        previewElement.src = imageUrl;
        previewElement.style.width = '100%';
        previewElement.style.height = '100%';
        previewElement.style.objectFit = 'cover'; // Auto adjust to frame
        return;
    }
    
    // Otherwise assume it's a container div
    previewElement.innerHTML = `<img src="${imageUrl}" alt="Captured Image" style="width: 100%; height: 100%; object-fit: cover;">`;
}

// Convert data URL to Blob for upload
function dataURLtoBlob(dataUrl) {
    // Split the data URL to get the data part
    const arr = dataUrl.split(',');
    // Extract mime type
    const mime = arr[0].match(/:(.*?);/)[1];
    // Convert base64 to binary
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    // Convert to binary array
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

// Show error message
function showCameraError(message) {
    // Check if there is a custom error function
    if (typeof showError === 'function') {
        showError(message);
        return;
    }
    
    // Otherwise use alert
    alert('Camera Error: ' + message);
}

/**
 * Helper function to setup camera and file upload for a form
 * 
 * @param {Object} options Configuration options
 * @param {string} options.previewElementId ID of the element that will display the image preview
 * @param {string} options.fileInputId ID of the file input element
 * @param {string} options.hiddenInputId ID of the hidden input to store the image URL/data
 * @param {string} options.cameraBtnId ID of the button to activate the camera
 * @param {string} options.formContext A context string to identify this camera instance
 */
function setupImageCapture(options) {
    const previewElement = document.getElementById(options.previewElementId);
    const fileInput = document.getElementById(options.fileInputId);
    const hiddenInput = document.getElementById(options.hiddenInputId);
    const cameraBtn = document.getElementById(options.cameraBtnId);
    
    if (!previewElement || !fileInput || !hiddenInput || !cameraBtn) {
        console.error('Setup Image Capture: One or more required elements not found');
        return;
    }
    
    // Set up file input change handler
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            // Show loading indicator
            previewElement.innerHTML = `
                <div class="d-flex justify-content-center align-items-center h-100">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Processing...</span>
                    </div>
                    <span class="ms-2">Processing image...</span>
                </div>
            `;
            
            try {
                // Get username from session/local storage
                const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'admin';
                
                // Check if Cloudinary functions are available
                if (typeof getCloudinaryCredentials === 'function' && typeof uploadToCloudinary === 'function') {
                    // Get Cloudinary credentials
                    const credentials = await getCloudinaryCredentials(username);
                    
                    // Upload to Cloudinary
                    const cloudinaryUrl = await uploadToCloudinary(
                        file, 
                        credentials.cloud_name, 
                        credentials.upload_preset
                    );
                    
                    // Update preview and hidden input
                    updatePreviewElement(previewElement, cloudinaryUrl);
                    hiddenInput.value = cloudinaryUrl;
                    
                    // Show success message if available
                    if (typeof showSuccess === 'function') {
                        showSuccess('Image uploaded successfully!');
                    }
                } else {
                    // Fallback to local processing
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        updatePreviewElement(previewElement, event.target.result);
                        hiddenInput.value = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('Error processing image:', error);
                
                // Show error if function available
                if (typeof showError === 'function') {
                    showError('Failed to process image: ' + error.message);
                }
                
                // Fallback to local processing
                const reader = new FileReader();
                reader.onload = function(event) {
                    updatePreviewElement(previewElement, event.target.result);
                    hiddenInput.value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
    });
    
    // Set up camera button click handler
    cameraBtn.addEventListener('click', function() {
        openCameraModal(options.formContext, options.previewElementId, options.hiddenInputId);
    });
    
    // Initialize preview if there's an existing image
    if (hiddenInput.value) {
        updatePreviewElement(previewElement, hiddenInput.value);
    }
}

// Initialize the camera modal when the script loads
document.addEventListener('DOMContentLoaded', function() {
    initializeCameraModal();
});