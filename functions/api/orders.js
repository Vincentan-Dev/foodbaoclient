import { getSupabaseConfig, getCorsHeaders, supabaseFetch } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

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

    // Handle different order operations based on HTTP method
    if (request.method === "GET") {
      return await handleGetOrders(request, supabaseUrl, supabaseKey, corsHeaders);
    } else if (request.method === "POST") {
      return await handleCreateOrder(request, supabaseUrl, supabaseKey, corsHeaders);
    } else if (request.method === "PUT" || request.method === "PATCH") {
      return await handleUpdateOrder(request, supabaseUrl, supabaseKey, corsHeaders);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error in orders API:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Internal server error: ${error.message}`
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
}

// Handle GET requests to fetch orders
async function handleGetOrders(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('id');
    const username = url.searchParams.get('username');
    
    let apiUrl;
    
    // Fetch a specific order if ID is provided with nested relationships
    if (orderId) {
      apiUrl = `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*,order_items(id,order_id,item_id,item_name,item_code,quantity,unit_price,total_price,image_url,order_type,created_at,username,order_item_variations(id,order_item_id,variation_id,variation_name,variation_price,group_name,created_at,username))`;
    }
    // Fetch orders for a specific business username with complete nested data
    else if (username) {
      apiUrl = `${supabaseUrl}/rest/v1/orders?business_username=eq.${encodeURIComponent(username)}&select=*,order_items(id,order_id,item_id,item_name,item_code,quantity,unit_price,total_price,image_url,order_type,created_at,username,order_item_variations(id,order_item_id,variation_id,variation_name,variation_price,group_name,created_at,username))&order=created_at.desc`;
    }
    // Return error if no filtering parameter is provided
    else {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required parameters: id or username"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Fetch orders from Supabase with all related data
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }
    
    const orders = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: orders
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error fetching orders: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Handle POST requests to create new orders
async function handleCreateOrder(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    // Parse the order data from the request body
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.business || !orderData.orderItems || !orderData.totals) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required order information"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Use the pre-generated order number from client if provided, otherwise generate one
    const orderNumber = orderData.orderNumber || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log('Using order number format:', orderNumber);
    
    // Create the main order record in the orders table
    const mainOrder = {
      order_number: orderNumber,
      business_username: orderData.business.username,
      username: orderData.business.username, // Add username field for tracking stall/vendor
      business_name: orderData.business.name,
      table_number: orderData.business.tableNo,
      customer_name: orderData.customer?.name || 'Guest Customer', // Customer name is now optional
      customer_phone: orderData.customer?.phone || 'N/A', // Customer phone is now optional
      subtotal: orderData.totals.subtotal,
      sst: orderData.totals.sst, // New field for SST
      sales_tax: orderData.totals.salesTax, // New field for sales tax
      rounding: orderData.totals.rounding, // New field for rounding adjustment
      total_amount: orderData.totals.total,
      notes: orderData.notes || '',
      status: orderData.status || 'PENDING',
      is_printed: false, // Track if order has been printed
      created_at: new Date().toISOString()
    };
    
    console.log('Creating order in Supabase:', mainOrder);
    
    // Insert the main order to get the order ID
    const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(mainOrder)
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Error creating order: ${orderResponse.status} ${errorText}`);
    }
    
    const createdOrder = await orderResponse.json();
    const orderId = createdOrder[0].id;
    
    console.log(`Created main order with ID: ${orderId}`);
    
    // Now create order items with the order ID
    const orderItems = orderData.orderItems.map(item => ({
      order_id: orderId,
      item_id: item.itemId,
      item_name: item.name,
      item_code: item.itemCode,
      quantity: item.quantity,
      unit_price: item.basePrice,
      total_price: item.totalPrice,
      image_url: item.imageUrl || '',
      order_type: item.orderType || '',
      username: orderData.business.username, // Add username field for tracking/filtering
      created_at: new Date().toISOString()
    }));
    
    console.log(`Creating ${orderItems.length} order items`);
    
    // Insert all order items with better error handling
    let createdItems = [];
    try {
      const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(orderItems)
      });
      
      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        throw new Error(`Error creating order items: ${itemsResponse.status} ${errorText}`);
      }
      
      createdItems = await itemsResponse.json();
      console.log(`Successfully created ${createdItems.length} order items`);
      
      // Verify all items were created
      if (createdItems.length !== orderItems.length) {
        console.warn(`Warning: Expected to create ${orderItems.length} items but only created ${createdItems.length}`);
      }
    } catch (error) {
      console.error('Error creating order items:', error);
      // Don't delete the main order, but flag the error
      return new Response(JSON.stringify({
        success: false,
        message: `Error creating order items: ${error.message}`,
        orderId: orderId, // Return the order ID so it can be found/fixed later
        orderNumber: orderNumber
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Process all variations with better error handling
    if (orderData.orderItems.some(item => item.variations && item.variations.length > 0)) {
      try {
        let allVariations = [];
        
        // Collect all variations from all items with better item ID mapping
        orderData.orderItems.forEach((item, itemIndex) => {
          if (item.variations && item.variations.length > 0) {
            // Make sure we have a valid order item ID to link to
            const orderItemId = createdItems[itemIndex]?.id;
            if (!orderItemId) {
              console.warn(`Warning: Missing order item ID for item at index ${itemIndex, item.itemId}`);
              return; // Skip this item's variations
            }
            
            // Add all variations for this item
            item.variations.forEach(variation => {
              // Ensure we have valid variation data
              if (!variation.id || !variation.name) {
                console.warn('Warning: Skipping invalid variation data:', variation);
                return;
              }
              
              allVariations.push({
                order_item_id: orderItemId,
                variation_id: variation.id,
                variation_name: variation.name,
                variation_price: parseFloat(variation.price) || 0,
                group_name: variation.groupName || 'Other',
                username: orderData.business.username // Add username field for tracking/filtering
              });
            });
          }
        });
        
        console.log(`Creating ${allVariations.length} order item variations`);
        
        // Insert variations if any exist
        if (allVariations.length > 0) {
          const variationsResponse = await fetch(`${supabaseUrl}/rest/v1/order_item_variations`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=representation" // Changed from minimal to representation to get data back
            },
            body: JSON.stringify(allVariations)
          });
          
          if (!variationsResponse.ok) {
            const errorText = await variationsResponse.text();
            throw new Error(`Error creating variations: ${variationsResponse.status} ${errorText}`);
          }
          
          const createdVariations = await variationsResponse.json();
          console.log(`Successfully saved ${createdVariations.length} variations`);
          
          if (createdVariations.length !== allVariations.length) {
            console.warn(`Warning: Expected to create ${allVariations.length} variations but only created ${createdVariations.length}`);
          }
        } else {
          console.log('No variations to create');
        }
      } catch (error) {
        console.error('Error processing variations:', error);
        // Don't fail the entire order, but include warning in response
        return new Response(JSON.stringify({
          success: true, // Still consider the order successful
          message: "Order created but with variation errors: " + error.message,
          warning: "Some item variations may not have been saved properly",
          orderId: orderId,
          orderNumber: orderNumber,
          data: createdOrder[0],
          printStatus: createdOrder[0].is_printed
        }), {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    // Print the order immediately
    try {
      // Call the print-order endpoint to generate and print the receipt
      const printResponse = await fetch(`${supabaseUrl}/functions/v1/print-order`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          orderId: orderId,
          username: orderData.business.username,
          orderNumber: orderNumber
        })
      }).catch(e => {
        console.log('Print service not available, continuing without printing:', e);
        return { ok: false };
      });
      
      if (printResponse && printResponse.ok) {
        console.log('Order sent to printer successfully');
        
        // Update the order's print status
        await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ is_printed: true })
        });
      } else {
        console.log('Print service did not respond or errored - order created but not printed');
      }
    } catch (printError) {
      console.error('Error printing order:', printError);
      // Continue processing despite print error
    }
    
    // Return success response with order details
    return new Response(JSON.stringify({
      success: true,
      message: "Order created successfully",
      orderId: orderId,
      orderNumber: orderNumber,
      data: createdOrder[0],
      printStatus: createdOrder[0].is_printed
    }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error creating order: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Handle PUT/PATCH requests to update order status
async function handleUpdateOrder(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    const orderData = await request.json();
    const orderId = orderData.id;
    
    if (!orderId) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing order ID"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Prepare the update record, only allowing certain fields to be updated
    const updateRecord = {
      status: orderData.status,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined values to avoid overwriting with nulls
    Object.keys(updateRecord).forEach(key => {
      if (updateRecord[key] === undefined) {
        delete updateRecord[key];
      }
    });
    
    if (Object.keys(updateRecord).length <= 1) { // Only has updated_at field
      return new Response(JSON.stringify({
        success: false,
        message: "No valid fields to update"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Update the order record
    const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updateRecord)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} ${errorText}`);
    }
    
    const updatedOrder = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error updating order: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}