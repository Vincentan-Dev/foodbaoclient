// Client-side function to get Cloudinary credentials
async function fetchCloudinaryAccount(username) {
    try {
        // This calls your serverless function endpoint
        const response = await fetch(`/api/cloudinary-credentials`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Cloudinary credentials: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching Cloudinary credentials:', error);
        throw error;
    }
}