/**
 * FullScreen Camera Component
 * A mobile-first camera implementation that mimics native app camera UI.
 * Features:
 * - Full screen camera view
 * - Works with front/back cameras
 * - Proper orientation handling
 * - Cloudinary upload integration
 */

class FullscreenCamera {
    constructor(options = {}) {
        this.options = {
            cloudNameProvider: null, // Function that returns cloud_name
            uploadPresetProvider: null, // Function that returns upload_preset
            onImageCaptured: null, // Callback after successful capture
            onUploadSuccess: null, // Callback after successful upload
            onUploadError: null, // Callback after failed upload
            onCameraError: null, // Callback on camera error
            preferredFacingMode: 'environment', // 'environment' for back camera, 'user' for front
            ...options
        };
        
        this.stream = null;
        this.videoElement = null;
        this.cameraContainer = null;
        this.facingMode = this.options.preferredFacingMode;
        
        // Create camera elements if they don't exist
        this._createElements();
        
        // Bind methods to this context
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.takePhoto = this.takePhoto.bind(this);
        this.switchCamera = this.switchCamera.bind(this);
        this._handleResize = this._handleResize.bind(this);
    }
    
    /**
     * Create and inject camera UI elements into the DOM
     * @private
     */
    _createElements() {
        // Check if container already exists
        let existingContainer = document.getElementById('fullscreen-camera-container');
        if (existingContainer) {
            this.cameraContainer = existingContainer;
            this.videoElement = existingContainer.querySelector('video');
            return;
        }
        
        // Create container
        this.cameraContainer = document.createElement('div');
        this.cameraContainer.id = 'fullscreen-camera-container';
        this.cameraContainer.className = 'fullscreen-camera-container';
        
        // Create video element
        this.videoElement = document.createElement('video');
        this.videoElement.id = 'fullscreen-camera-video';
        this.videoElement.className = 'fullscreen-camera-video';
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.setAttribute('playsinline', '');
        
        // Create UI buttons
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'camera-controls';
        
        // Capture button
        const captureButton = document.createElement('button');
        captureButton.className = 'camera-button capture-button';
        captureButton.innerHTML = '<i class="fas fa-camera"></i>';
        captureButton.addEventListener('click', this.takePhoto);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'camera-button close-button';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', this.close);
        
        // Switch camera button
        const switchButton = document.createElement('button');
        switchButton.className = 'camera-button switch-button';
        switchButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
        switchButton.addEventListener('click', this.switchCamera);
        
        // Assemble UI
        controlsContainer.appendChild(closeButton);
        controlsContainer.appendChild(captureButton);
        controlsContainer.appendChild(switchButton);
        
        // Add elements to container
        this.cameraContainer.appendChild(this.videoElement);
        this.cameraContainer.appendChild(controlsContainer);
        
        // Add CSS styles
        this._addStyles();
        
        // Append to body
        document.body.appendChild(this.cameraContainer);
    }
    
    /**
     * Add required CSS styles for the camera UI
     * @private
     */
    _addStyles() {
        // Check if styles already exist
        if (document.getElementById('fullscreen-camera-styles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'fullscreen-camera-styles';
        styleElement.textContent = `
            .fullscreen-camera-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000;
                z-index: 9999;
                display: none;
                overflow: hidden;
            }
            
            .fullscreen-camera-video {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .camera-controls {
                position: absolute;
                bottom: 30px;
                left: 0;
                width: 100%;
                display: flex;
                justify-content: space-around;
                align-items: center;
                z-index: 10000;
            }
            
            .camera-button {
                border: none;
                background: rgba(0, 0, 0, 0.5);
                color: white;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                font-size: 24px;
            }
            
            .capture-button {
                width: 70px;
                height: 70px;
                background-color: rgba(255, 255, 255, 0.8);
                color: #333;
                border: 3px solid white;
            }
            
            .close-button, .switch-button {
                width: 50px;
                height: 50px;
            }
            
            .fullscreen-camera-loading {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
                color: white;
                font-size: 18px;
            }
            
            .fullscreen-camera-spinner {
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 5px solid white;
                width: 50px;
                height: 50px;
                animation: camera-spinner 1s linear infinite;
            }
            
            @keyframes camera-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .fullscreen-camera-error {
                position: absolute;
                top: 20%;
                left: 10%;
                width: 80%;
                background: rgba(255, 0, 0, 0.7);
                color: white;
                padding: 15px;
                border-radius: 5px;
                text-align: center;
                z-index: 10002;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    /**
     * Start the camera and open the fullscreen interface
     */
    async open() {
        this.cameraContainer.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        try {
            // Start camera with current facing mode
            await this._startCamera();
            
            // Add resize listener for orientation changes
            window.addEventListener('resize', this._handleResize);
            
        } catch (error) {
            console.error('Camera error:', error);
            this._showError('Unable to access camera: ' + error.message);
            
            if (this.options.onCameraError) {
                this.options.onCameraError(error);
            }
        }
    }
    
    /**
     * Close the camera interface and stop the stream
     */
    close() {
        // Stop stream if active
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Hide container
        this.cameraContainer.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
        
        // Remove resize listener
        window.removeEventListener('resize', this._handleResize);
    }
    
    /**
     * Start the camera with the current facing mode
     * @private
     */
    async _startCamera() {
        // If there's an active stream, stop it first
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Get optimal camera resolution based on screen size
        const constraints = {
            video: {
                width: { ideal: window.innerWidth },
                height: { ideal: window.innerHeight },
                facingMode: this.facingMode
            },
            audio: false
        };
        
        // Start the camera stream
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoElement.srcObject = this.stream;
        
        // Handle video loading
        return new Promise((resolve) => {
            this.videoElement.onloadedmetadata = () => {
                this.videoElement.play();
                resolve();
            };
        });
    }
    
    /**
     * Switch between front and back cameras
     */
    async switchCamera() {
        // Toggle facing mode
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        
        // Show loading state
        this._showLoading();
        
        try {
            // Restart camera with new facing mode
            await this._startCamera();
            this._hideLoading();
        } catch (error) {
            this._hideLoading();
            this._showError('Failed to switch camera: ' + error.message);
            console.error('Error switching camera:', error);
        }
    }
    
    /**
     * Capture photo from camera stream
     */
    async takePhoto() {
        if (!this.stream) return;
        
        // Create canvas for photo capture
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        // Capture current frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert to JPEG data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Notify about captured image via callback
        if (this.options.onImageCaptured) {
            this.options.onImageCaptured(imageDataUrl);
        }
        
        // Try uploading to Cloudinary if providers are available
        if (this.options.cloudNameProvider && this.options.uploadPresetProvider) {
            this._showLoading();
            
            try {
                // Get Cloudinary credentials
                const cloudName = await this.options.cloudNameProvider();
                const uploadPreset = await this.options.uploadPresetProvider();
                
                if (!cloudName || !uploadPreset) {
                    throw new Error('Invalid Cloudinary credentials');
                }
                
                // Convert data URL to blob
                const blob = await fetch(imageDataUrl).then(res => res.blob());
                
                // Upload to Cloudinary
                const cloudinaryUrl = await this._uploadToCloudinary(blob, cloudName, uploadPreset);
                
                // Success callback
                if (this.options.onUploadSuccess) {
                    this.options.onUploadSuccess(cloudinaryUrl);
                }
                
                this._hideLoading();
                this.close();
                
            } catch (error) {
                console.error('Upload error:', error);
                this._hideLoading();
                this._showError('Upload failed: ' + error.message);
                
                // Error callback
                if (this.options.onUploadError) {
                    this.options.onUploadError(error, imageDataUrl);
                }
            }
        } else {
            // No upload configured, just close with the local image
            this.close();
        }
    }
    
    /**
     * Upload image to Cloudinary
     * @private
     * @param {Blob} blob - Image blob to upload
     * @param {string} cloudName - Cloudinary cloud name
     * @param {string} uploadPreset - Cloudinary upload preset
     * @returns {Promise<string>} - URL of uploaded image
     */
    async _uploadToCloudinary(blob, cloudName, uploadPreset) {
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', uploadPreset);
        
        // Upload to Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }
        
        const data = await response.json();
        return data.secure_url;
    }
    
    /**
     * Handle device orientation and resize events
     * @private
     */
    _handleResize() {
        // Restart the camera to adjust to the new orientation
        if (this.stream && this.cameraContainer.style.display === 'block') {
            this._startCamera().catch(error => {
                console.error('Error restarting camera:', error);
            });
        }
    }
    
    /**
     * Show loading indicator
     * @private
     */
    _showLoading() {
        // Remove any existing loading indicator
        this._hideLoading();
        
        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'fullscreen-camera-loading';
        loadingDiv.innerHTML = '<div class="fullscreen-camera-spinner"></div>';
        
        // Add to container
        this.cameraContainer.appendChild(loadingDiv);
    }
    
    /**
     * Hide loading indicator
     * @private
     */
    _hideLoading() {
        const loadingElement = this.cameraContainer.querySelector('.fullscreen-camera-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
    
    /**
     * Show error message
     * @private
     * @param {string} message - Error message to display
     */
    _showError(message) {
        // Remove any existing error message
        this._hideError();
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fullscreen-camera-error';
        errorDiv.textContent = message;
        
        // Add to container
        this.cameraContainer.appendChild(errorDiv);
        
        // Auto-hide after 3 seconds
        setTimeout(() => this._hideError(), 3000);
    }
    
    /**
     * Hide error message
     * @private
     */
    _hideError() {
        const errorElement = this.cameraContainer.querySelector('.fullscreen-camera-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FullscreenCamera };
}