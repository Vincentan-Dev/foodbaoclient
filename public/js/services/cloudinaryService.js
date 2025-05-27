// Add this at the top of your file
console.log('Loaded cloudinaryService.js version 1.0.1');

window.cloudinaryService = {
  getAccountByUsername: async function(username) {
    try {
      console.log('Looking up Cloudinary account for:', username);
      
      // Use our Cloudflare API
      const response = await fetch(`../api/cloudinary?action=get&username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching account: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Unknown error');
      }
      
      return {
        success: true,
        items: result.data ? [result.data] : []
      };
    } catch (error) {
      console.error('Error getting Cloudinary account:', error);
      return {
        success: false,
        error: error.message,
        items: []
      };
    }
  },
  
  upsertAccount: async function(accountData) {
    try {
      console.log('Upserting Cloudinary account for user:', accountData.username);
      
      // Use our Cloudflare API
      const response = await fetch('../api/cloudinary?action=upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
      });
      
      if (!response.ok) {
        throw new Error(`Error upserting account: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Unknown error');
      }
      
      console.log('Upsert result:', result);
      return result.data;
    } catch (error) {
      console.error('Error upserting Cloudinary account:', error);
      throw error;
    }
  },
  
  validateCredentials: async function(credentials) {
    try {
      console.log('Testing Cloudinary credentials with upload/delete test');
      
      // First, try the comprehensive test with upload/delete
      const response = await fetch('../api/cloudinary-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error(`Error validating credentials: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Validation result:', result);
      
      return {
        valid: result.valid === true,
        message: result.message,
        details: result.details
      };
    } catch (error) {
      console.error('Error in upload/delete test:', error);
      
      // Fall back to simple ping test if the comprehensive test fails
      try {
        console.log('Falling back to ping test');
        
        const pingResponse = await fetch('../api/cloudinary?action=validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        });
        
        if (!pingResponse.ok) {
          throw new Error(`Error validating credentials: ${pingResponse.status}`);
        }
        
        const pingResult = await pingResponse.json();
        console.log('Ping validation result:', pingResult);
        
        return {
          valid: pingResult.valid === true,
          message: pingResult.message,
          details: pingResult.details
        };
      } catch (pingError) {
        console.error('Error in ping test:', pingError);
        return {
          valid: false,
          message: `Failed to validate credentials: ${error.message}, ping also failed: ${pingError.message}`,
          details: null
        };
      }
    }
  },
  
  // Keep these for backwards compatibility 
  createAccount: async function(accountData) {
    console.log('Using upsert instead of create');
    return this.upsertAccount(accountData);
  },
  
  updateAccount: async function(id, accountData) {
    console.log('Using upsert instead of update');
    return this.upsertAccount({...accountData, id});
  },

  // This function should call your cloudinary-credentials API
  getCredentials: async function() {
    try {
      const response = await fetch('../api/cloudinary-credentials');
      if (!response.ok) {
        throw new Error('Failed to load Cloudinary credentials');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Cloudinary credentials:', error);
      throw error;
    }
  },
  
  uploadImage: async function(file, folder = 'general') {
    try {
      // Get credentials via API
      const credentials = await this.getCredentials();
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', credentials.upload_preset);
      formData.append('folder', folder);
      
      // Upload directly to Cloudinary (safe because we're only using public credentials)
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloud_name}/image/upload`, 
        {
          method: 'POST',
          body: formData
        }
      );
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  },
  
  deleteImage: async function(publicId) {
    try {
      // Call our secure API endpoint that uses environment variables
      const response = await fetch('../api/cloudinary-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public_id: publicId })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting Cloudinary image:', error);
      throw error;
    }
  }
};

// Add this global error handler if you don't already have one
window.handleError = function(error, message) {
  console.error(message || 'An error occurred', error);
  
  // Parse the error message to be more user-friendly
  let displayMessage = message || 'An error occurred';
  
  if (error) {
    if (error.message && error.message.includes('NetworkError')) {
      displayMessage = 'Network error - Check your internet connection';
    } else if (error.message && error.message.includes('CORS')) {
      displayMessage = 'CORS error - Using proxy...';
    } else if (error.message) {
      displayMessage = error.message;
    }
  }
  
  // Show toast if Materialize is available
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({
      html: `<i class="material-icons left">error</i> ${displayMessage}`,
      classes: 'red rounded',
      displayLength: 5000
    });
  } else {
    alert(displayMessage);
  }
};

const cloudinaryService = (function() {
    // Upload an image to Cloudinary
    async function uploadImage(file, folder = 'uploads') {
        // Show toast notification if Materialize is available
        if (window.M) {
            M.toast({html: 'Uploading image...', classes: 'blue'});
        }
        
        try {
            // Step 1: Get secure upload parameters from our backend
            const paramsResponse = await fetch('../api/cloudinary-operations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operation: 'get_upload_params',
                    folder: folder
                })
            });
            
            if (!paramsResponse.ok) {
                throw new Error(`Failed to get upload parameters: ${paramsResponse.status}`);
            }
            
            const paramsData = await paramsResponse.json();
            
            if (!paramsData.success) {
                throw new Error(paramsData.message || 'Failed to get upload parameters');
            }
            
            const uploadParams = paramsData.uploadParams;
            
            // Step 2: Use these parameters to upload directly to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', uploadParams.api_key);
            formData.append('timestamp', uploadParams.timestamp);
            formData.append('signature', uploadParams.signature);
            formData.append('folder', uploadParams.folder);
            
            // Include upload_preset if it exists
            if (uploadParams.upload_preset) {
                formData.append('upload_preset', uploadParams.upload_preset);
            }
            
            // Generate a unique filename instead of a path - IMPORTANT FIX
            const timestamp = new Date().getTime();
            const uniqueFileName = `file_${timestamp}`;
            formData.append('public_id', uniqueFileName);
            
            console.log('Uploading to Cloudinary with params:', {
                cloudName: uploadParams.cloud_name,
                folder: uploadParams.folder,
                timestamp: uploadParams.timestamp,
                publicId: uniqueFileName
            });
            
            // Upload to Cloudinary
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${uploadParams.cloud_name}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Upload failed: ${errorText}`);
            }
            
            const uploadResult = await uploadResponse.json();
            
            // Add this check in cloudinaryService.js uploadImage function
            // After successful upload:
            if (uploadResult.secure_url) {
                console.log('Cloudinary upload successful, URL:', uploadResult.secure_url);
                return uploadResult.secure_url;
            } else {
                throw new Error('Upload succeeded but no URL was returned');
            }
            
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            
            // Show error message
            if (window.M) {
                M.toast({html: `Upload failed: ${error.message}`, classes: 'red'});
            }
            
            throw error;
        }
    }
    
    // Delete an image from Cloudinary
    async function deleteImage(imageUrl) {
        if (!imageUrl) return Promise.resolve();
        
        try {
            // Extract public_id from URL
            const urlParts = imageUrl.split('/');
            const filenameWithExtension = urlParts[urlParts.length - 1];
            const filename = filenameWithExtension.split('.')[0];
            
            // Find folder part
            const folderIndex = urlParts.findIndex(part => part === 'upload');
            let folder = '';
            
            if (folderIndex !== -1 && folderIndex + 2 < urlParts.length - 1) {
                folder = urlParts[folderIndex + 2];
            }
            
            const publicId = folder ? `${folder}/${filename}` : filename;
            
            // Call our API to delete the image
            const response = await fetch('../api/cloudinary-operations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operation: 'delete',
                    public_id: publicId
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Delete failed: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (window.M && result.success) {
                M.toast({html: 'Image deleted successfully', classes: 'green'});
            }
            
            return result;
        } catch (error) {
            console.error('Cloudinary delete error:', error);
            
            if (window.M) {
                M.toast({html: `Delete failed: ${error.message}`, classes: 'red'});
            }
            
            throw error;
        }
    }
    
    // Replace an image (delete old one if exists, then upload new one)
    async function replaceImage(file, oldImageUrl, folder = 'uploads') {
        try {
            // Delete the old image if it exists
            if (oldImageUrl) {
                try {
                    await deleteImage(oldImageUrl);
                } catch (error) {
                    console.warn('Failed to delete old image:', error);
                    // Continue with upload even if delete fails
                }
            }
            
            // Upload the new image
            return await uploadImage(file, folder);
        } catch (error) {
            console.error('Image replacement error:', error);
            throw error;
        }
    }
    
    return {
        uploadImage,
        deleteImage,
        replaceImage
    };
})();