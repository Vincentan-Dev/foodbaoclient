// Upload file to Cloudinary
async function uploadToCloudinary(file, cloudName, uploadPreset) {
    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        // Upload to Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}