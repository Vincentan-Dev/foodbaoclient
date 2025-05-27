export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow POST method
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  try {
    // Get request body
    const data = await request.json();
    
    if (!data.public_id) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing public_id parameter"
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Cloudinary API credentials from environment
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    
    if (!apiKey || !apiSecret || !cloudName) {
      return new Response(JSON.stringify({
        success: false,
        message: "Cloudinary credentials not configured",
        debug: {
          hasCloudName: !!cloudName,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret
        }
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    console.log('Deleting Cloudinary image:', data.public_id);
    
    // Create timestamp and signature for Cloudinary API
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create signature string (publicId + timestamp + apiSecret)
    const signatureString = `public_id=${data.public_id}&timestamp=${timestamp}${apiSecret}`;
    
    // Create SHA-1 signature using crypto
    const encoder = new TextEncoder();
    const signatureData = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', signatureData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Build the Cloudinary API request
    const formData = new FormData();
    formData.append('public_id', data.public_id);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);
    formData.append('signature', signature);
    
    // Send request to Cloudinary's destroy API
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Cloudinary delete response:', result);
    
    if (response.ok && result.result === 'ok') {
      return new Response(JSON.stringify({
        success: true,
        message: "Image deleted successfully"
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: result.error?.message || "Failed to delete image",
        details: result
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

function resetForm() {
  // Reset the form fields
  document.getElementById('category-form')?.reset();
  
  // Clear editing ID
  document.getElementById('category-form').dataset.editingId = '';
  
  // Reset image preview
  const preview = document.getElementById('category-image-preview');
  if (preview) {
    preview.src = '../img/placeholder-image.jpg';
    preview.classList.remove('has-image');
  }
  
  // Clear image URL field
  const imageUrlField = document.getElementById('category-image-url');
  if (imageUrlField) {
    imageUrlField.value = '';
  }
  
  // Clear selected file and previous URL
  selectedImageFile = null;
  previousImageUrl = null;
  
  // Update Materialize form fields
  M.updateTextFields();
  
  // Reset form title
  document.getElementById('form-title').textContent = 'Create New Category';
  
  // Switch to categories tab
  const tabsInstance = M.Tabs.getInstance(document.querySelector('.tabs'));
  if (tabsInstance) {
    tabsInstance.select('categories-tab');
  }
}