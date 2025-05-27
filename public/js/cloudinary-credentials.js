/**
 * FoodBao Cloudinary Credentials Helper
 * Fetches Cloudinary credentials from the API endpoint
 * Uses Cloudflare environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_UPLOAD_PRESET
 */

async function getCloudinaryCredentials(username) {
    try {
        // Get auth token for API request
        const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        
        // Cache credentials for better performance and to reduce API calls
        const cachedCredentials = sessionStorage.getItem('cloudinary_credentials');
        if (cachedCredentials) {
            try {
                const credentials = JSON.parse(cachedCredentials);
                // Make sure we have the required fields
                if (credentials && credentials.cloud_name && credentials.upload_preset) {
                    // Use cached credentials if they're less than 30 minutes old
                    const cacheTime = sessionStorage.getItem('cloudinary_credentials_time');
                    if (cacheTime && (Date.now() - parseInt(cacheTime)) < 1800000) {
                        return credentials;
                    }
                }
            } catch (parseError) {
                console.warn('Error parsing cached credentials, fetching fresh ones:', parseError);
                // Continue to fetch new credentials if parsing fails
            }
        }
        
        const response = await fetch('/api/cloudinary-credentials', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Cloudinary credentials: ${response.status}`);
        }
        
        const credentials = await response.json();
        
        // Validate the credentials contain required fields
        if (!credentials.cloud_name || !credentials.upload_preset) {
            throw new Error('Incomplete Cloudinary credentials received. Please check your Cloudflare environment variables.');
        }
        
        // Cache the credentials in sessionStorage
        sessionStorage.setItem('cloudinary_credentials', JSON.stringify(credentials));
        sessionStorage.setItem('cloudinary_credentials_time', Date.now().toString());
        
        return credentials;
    } catch (error) {
        console.error('Error getting Cloudinary credentials:', error);
        
        // Try to provide more specific error message based on error
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Could not connect to Cloudinary credentials service. Please check your network connection.');
        } else if (error.message.includes('Incomplete')) {
            throw new Error('Cloudinary is not properly configured. Please contact your administrator.');
        }
        
        throw error;
    }
}