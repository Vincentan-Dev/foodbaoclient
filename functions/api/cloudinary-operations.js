export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle preflight OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
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
    // Get request data
    const requestData = await request.json();
    const operation = requestData.operation;
    
    // Get Cloudinary credentials from environment variables
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    
    if (!cloudName || !apiKey || !apiSecret) {
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
    
    // Handle upload request - just return upload parameters
    if (operation === 'get_upload_params') {
      const folder = requestData.folder || 'uploads';
      const timestamp = Math.floor(Date.now() / 1000);
      
      // IMPORTANT FIX: Create the proper signature string
      // Cloudinary requires parameters to be in alphabetical order
      let paramsToSign = {};
      
      // Only include these parameters in the signature
      paramsToSign.folder = folder;
      paramsToSign.timestamp = timestamp;
      
      // Include upload_preset if it's provided
      if (uploadPreset) {
        paramsToSign.upload_preset = uploadPreset;
      }
      
      // Sort parameters alphabetically
      const sortedKeys = Object.keys(paramsToSign).sort();
      
      // Build signature string: param1=value1&param2=value2...&apiSecret
      let signatureString = '';
      for (const key of sortedKeys) {
        signatureString += `${key}=${paramsToSign[key]}&`;
      }
      
      // Remove the trailing & and add the API secret
      signatureString = signatureString.slice(0, -1) + apiSecret;
      
      console.log('String to sign:', signatureString.replace(apiSecret, '[SECRET]'));
      
      // Create SHA-1 signature
      const encoder = new TextEncoder();
      const signatureData = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-1', signatureData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Return the upload parameters
      return new Response(JSON.stringify({
        success: true,
        uploadParams: {
          cloud_name: cloudName,
          api_key: apiKey,
          timestamp: timestamp,
          signature: signature,
          folder: folder,
          upload_preset: uploadPreset
        }
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Handle delete operation
    if (operation === 'delete') {
      const publicId = requestData.public_id;
      
      if (!publicId) {
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
      
      console.log('Deleting Cloudinary image:', publicId);
      
      // Create timestamp and signature
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      
      // Create SHA-1 signature
      const encoder = new TextEncoder();
      const signatureData = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-1', signatureData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Build the Cloudinary API request
      const formData = new FormData();
      formData.append('public_id', publicId);
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
    }
    
    // Unknown operation
    return new Response(JSON.stringify({
      success: false,
      message: "Unknown operation"
    }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
    
  } catch (error) {
    console.error("Cloudinary operations error:", error);
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