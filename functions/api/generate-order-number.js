// This serverless function generates order numbers in the format ORD-DDMMYYAAXXX
// Where:
// - DDMMYY is the current date
// - AA represents alphabetical counter that increments after XXX reaches 999
// - XXX is a numeric counter that resets daily, starting from 001

// Import required dependencies
import { getSupabaseConfig, supabaseFetch } from './_supabaseClient.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  
  // Handle OPTIONS request for CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Generate the order number
    const orderNumber = await generateOrderNumber(supabaseUrl, supabaseKey);
    
    // Return the generated order number
    return new Response(JSON.stringify({
      success: true,
      orderNumber: orderNumber
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error generating order number:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error generating order number: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to generate the order number in the format ORD-DDMMYYAAXXX
async function generateOrderNumber(supabaseUrl, supabaseKey) {
  const now = new Date();
  
  // Format the date part: DDMMYY
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = String(now.getFullYear()).slice(-2);
  const datePart = `${day}${month}${year}`;
  
  try {
    // Query to find the latest order number for today
    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=order_number&order_number=like.ORD-${datePart}%&order=order_number.desc.nullslast&limit=1`, 
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to query latest order: ${response.status}`);
    }
    
    const orders = await response.json();
    let counterPart = 'AA001'; // Default starting value
    
    if (orders && orders.length > 0 && orders[0].order_number) {
      // Extract the counter part (AAXXX) from the latest order number
      const latestCounter = orders[0].order_number.slice(-5);
      
      // Parse the alpha part (AA) and numeric part (XXX)
      const alphaPart = latestCounter.slice(0, 2);
      const numericPart = parseInt(latestCounter.slice(2), 10);
      
      if (numericPart < 999) {
        // Increment the numeric part
        counterPart = alphaPart + String(numericPart + 1).padStart(3, '0');
      } else {
        // Increment the alpha part
        const firstChar = alphaPart.charCodeAt(0);
        const secondChar = alphaPart.charCodeAt(1);
        
        if (secondChar < 90) { // 'Z' is 90
          // Increment the second letter
          counterPart = String.fromCharCode(firstChar) + String.fromCharCode(secondChar + 1) + '001';
        } else {
          // Increment the first letter and reset the second letter
          counterPart = String.fromCharCode(firstChar + 1) + 'A001';
        }
      }
    }
    
    return `ORD-${datePart}${counterPart}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to a timestamp-based format if there's an error
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${datePart}AA${timestamp.slice(0, 3)}`;
  }
}