import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders();

  // Handle OPTIONS request for CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed, use POST"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    // Get Supabase credentials
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

    // Parse request body
    const data = await request.json();
    const { orderId, username, orderNumber } = data;

    if (!orderId || !username) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required parameters: orderId or username"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Fetch the order details with items
    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*,order_items(*)`, 
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Error fetching order: ${orderResponse.status} ${errorText}`);
    }

    const orders = await orderResponse.json();
    
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Order not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const order = orders[0];
    
    // Fetch variations for each order item
    const orderItems = order.order_items || [];
    for (const item of orderItems) {
      const variationsResponse = await fetch(
        `${supabaseUrl}/rest/v1/order_item_variations?order_item_id=eq.${item.id}`, 
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        }
      );

      if (variationsResponse.ok) {
        item.variations = await variationsResponse.json();
      } else {
        console.error(`Error fetching variations for order item ${item.id}`);
        item.variations = [];
      }
    }

    // Get printer settings for the username
    const printerSettingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/printer_settings?username=eq.${encodeURIComponent(username)}&select=*`, 
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );

    let printerSettings = null;
    if (printerSettingsResponse.ok) {
      const settings = await printerSettingsResponse.json();
      if (settings && settings.length > 0) {
        printerSettings = settings[0];
      }
    }

    // Format the receipt for printing
    // This generates ESC/POS commands for thermal printers
    const receiptData = formatReceiptForPrinting(order, printerSettings);

    // In a real implementation, this would connect to a local or network printer service
    // For now, we'll simulate a successful print request
    // In a production environment, you'd use a library like escpos or node-thermal-printer
    // and possibly WebUSB, WebBluetooth, or a local service for printing

    // Update the order as printed
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ is_printed: true })
    });

    // Return success
    return new Response(JSON.stringify({
      success: true,
      message: "Order sent to printer",
      receiptLength: receiptData.length, // Just for debugging
      orderNumber: orderNumber,
      printTimestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error('Error in print order API:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error printing order: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

/**
 * Format receipt data for thermal printer
 * This is a placeholder implementation that would normally generate ESC/POS commands
 */
function formatReceiptForPrinting(order, printerSettings) {
  // In a real implementation, we'd use escpos commands
  // For now, we'll just generate placeholder text
  const now = new Date().toLocaleString();
  let receipt = [];
  
  // Header
  receipt.push("\\x1B\\x40"); // Init printer
  receipt.push("\\x1B\\x61\\x01"); // Center align
  
  // Business info from printer settings
  if (printerSettings) {
    receipt.push(`${printerSettings.header_text || order.business_name}`);
    if (printerSettings.address) receipt.push(printerSettings.address);
    if (printerSettings.phone) receipt.push(`Tel: ${printerSettings.phone}`);
  } else {
    receipt.push(order.business_name);
  }
  
  receipt.push(`\\x1B\\x61\\x00`); // Left align
  receipt.push(`Order #: ${order.order_number}`);
  receipt.push(`Date: ${now}`);
  receipt.push(`Table: ${order.table_number}`);
  if (order.customer_name !== 'Guest Customer') {
    receipt.push(`Customer: ${order.customer_name}`);
  }
  if (order.customer_phone !== 'N/A') {
    receipt.push(`Phone: ${order.customer_phone}`);
  }
  receipt.push("--------------------------------");
  
  // Items
  receipt.push("Items:");
  (order.order_items || []).forEach(item => {
    receipt.push(`${item.quantity}x ${item.item_name} - RM${(item.total_price).toFixed(2)}`);
    
    // Print variations if any
    (item.variations || []).forEach(variation => {
      const priceInfo = variation.variation_price > 0 ? ` (+RM${variation.variation_price.toFixed(2)})` : '';
      receipt.push(`  * ${variation.group_name}: ${variation.variation_name}${priceInfo}`);
    });
  });
  
  receipt.push("--------------------------------");
  
  // Totals
  receipt.push(`Subtotal: RM${order.subtotal.toFixed(2)}`);
  receipt.push(`Service fee: RM${order.service_fee.toFixed(2)}`);
  receipt.push(`Total: RM${order.total_amount.toFixed(2)}`);
  
  // Footer
  if (order.notes) {
    receipt.push("--------------------------------");
    receipt.push(`Notes: ${order.notes}`);
  }
  
  receipt.push("--------------------------------");
  receipt.push("\\x1B\\x61\\x01"); // Center align
  receipt.push("Thank you for your order!");
  if (printerSettings && printerSettings.footer_text) {
    receipt.push(printerSettings.footer_text);
  }
  receipt.push("\\x1B\\x61\\x00"); // Left align
  
  // Cut paper command would be here in a real implementation
  receipt.push("\\x1D\\x56\\x41"); // Full cut
  
  return receipt.join("\\r\\n");
}