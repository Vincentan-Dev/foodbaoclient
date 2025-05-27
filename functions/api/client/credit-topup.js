import { getSupabaseConfig, getCorsHeaders } from '../_supabaseClient.js';

/**
 * Credit Top-up API Endpoint
 * 
 * This endpoint handles credit top-up operations using the Supabase RPC function 'add_credit_ledger'.
 * It supports both TOP_UP and PURCHASE transaction types.
 * 
 * The RPC function handles:
 * - Creating the ledger entry
 * - Updating the client's balance and expiry date
 * 
 * The client-side profile update is still included as a fallback verification step.
 */

/**
 * Utility function to ensure all potential character(1) fields are properly formatted
 * Note: With the RPC function approach, this becomes less important as the database function
 * will handle the data validation, but we keep it for safety.
 */
function ensureSingleCharFields(obj) {
  const potentialCharFields = [
    'payment_method', 'agent', 'status', 'flag', 'type', 'mode', 'transaction_type'
  ];
  
  const copy = {...obj};
  let changes = false;
  
  for (const field of potentialCharFields) {
    if (field in copy && typeof copy[field] === 'string' && copy[field].length !== 1) {
      console.warn(`Field ${field} with value "${copy[field]}" is not a single character, fixing it.`);
      copy[field] = copy[field].charAt(0) || field.charAt(0).toUpperCase();
      changes = true;
    }
  }
  
  return { data: copy, changes };
}

// Helper function to convert payment method to single character code
function convertPaymentMethodToCode(paymentMethod) {
  if (!paymentMethod || typeof paymentMethod !== 'string') {
    return 'O'; // Default to 'O' for Other
  }
  
  try {
    const method = paymentMethod.toLowerCase();
    
    switch(method) {
      case 'bank_transfer': return 'B';
      case 'credit_card': return 'C';
      case 'e_wallet': return 'E';
      case 'cash': return 'M';
      case 'credit': return 'C';
      default: 
        // If it's already a single character, return it, otherwise default to 'O'
        return paymentMethod.length === 1 ? paymentMethod : 'O';
    }
  } catch (e) {
    console.error(`Error converting payment method: ${e.message}`);
    return 'O'; // Default on error
  }
}

// Helper function to convert transaction type to single character code
function convertTransactionTypeToCode(transactionType) {
  if (!transactionType || typeof transactionType !== 'string') {
    return 'T'; // Default to 'T' for TOP_UP
  }
  
  try {
    const type = transactionType.toUpperCase();
    
    switch(type) {
      case 'TOP_UP': return 'T';
      case 'PURCHASE': return 'P';
      case 'DEBIT': return 'D';
      case 'CREDIT': return 'C';
      case 'ADJUSTMENT': return 'A';
      case 'REFUND': return 'R';
      default: 
        // If it's already a single character, return it, otherwise default to 'T'
        return transactionType.length === 1 ? transactionType : 'T';
    }
  } catch (e) {
    console.error(`Error converting transaction type: ${e.message}`);
    return 'T'; // Default on error
  }
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({
        success: false,
        message: "Configuration error: Missing database credentials"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Only allow POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
      // Parse request body
    let data;
    try {
      // Log the request headers to diagnose content-type issues
      console.log('Request headers:', Object.fromEntries(request.headers.entries()));
      
      const contentType = request.headers.get('content-type') || '';
      console.log('Content-Type header:', contentType);
      
      if (!contentType.includes('application/json')) {
        console.warn('Warning: Content-Type is not application/json');
        // Try to read the body as text first
        const bodyText = await request.text();
        console.log('Request body as text:', bodyText);
        
        // Try to parse it as JSON
        try {
          data = JSON.parse(bodyText);
        } catch (jsonError) {
          throw new Error(`Invalid JSON: ${jsonError.message}. Body: ${bodyText.substring(0, 100)}...`);
        }
      } else {
        data = await request.json();
      }
      
      console.log('Parsed request data:', JSON.stringify(data));
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid request body: " + e.message
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle different types of credit operations based on transaction_type
    if (data.transaction_type === 'PURCHASE') {
      return await handlePurchaseTransaction(data, supabaseUrl, supabaseKey, corsHeaders);
    } else {
      // Default to regular top-up flow
      return await handleTopUpTransaction(data, supabaseUrl, supabaseKey, corsHeaders);
    }
  } catch (error) {
    console.error('Error processing top up:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while processing the top up",
      error_details: error.toString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

async function handleTopUpTransaction(data, supabaseUrl, supabaseKey, corsHeaders) {
  // Add logging to inspect the structure of data
  console.log('Top-up transaction data structure:', {
    hasUsername: !!data.username,
    usernameType: typeof data.username,
    hasAmount: !!data.amount,
    amountType: typeof data.amount,
    hasDays: !!data.days,
    daysType: typeof data.days,
    hasPaymentMethod: !!data.payment_method,
    paymentMethodType: typeof data.payment_method,
    paymentMethodValue: data.payment_method
  });
  
  const { username, amount, days, payment_method, transaction_type, description } = data;
  
  if (!username || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return new Response(JSON.stringify({
      success: false,
      message: "Valid username and amount are required"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  try {
    // Step 1: Find the client
    const clientInfo = await findClientByUsername(username, supabaseUrl, supabaseKey);
    const { currentBalance, currentExpiryDate } = clientInfo;
    
    console.log(`Found client data: ${JSON.stringify(clientInfo.client)}`);
    
    // Calculate new balance
    const newAmount = parseFloat(amount);
    const newBalance = currentBalance + newAmount;
    
    // Calculate new expiry date
    let newExpiryDate = new Date(currentExpiryDate);
    
    // If current expiry date is in the past, start from today
    const today = new Date();
    if (newExpiryDate < today) {
      newExpiryDate = new Date(today);
    }
    
    // Add days to expiry
    if (days && !isNaN(parseInt(days)) && parseInt(days) > 0) {
      newExpiryDate.setDate(newExpiryDate.getDate() + parseInt(days));
    }
    
    // Begin a transaction - first create a ledger entry
    const transactionTime = new Date().toISOString();
      // Step 2: Create ledger entry using our utility functions
    const paymentMethodCode = convertPaymentMethodToCode(payment_method);
    const transactionTypeCode = convertTransactionTypeToCode(transaction_type);
    const agentCode = data.agent ? 
      (data.agent.length === 1 ? data.agent : data.agent.charAt(0)) : 'W'; // W for Web
    
    // This object maintains compatibility with the old code but we'll only use specific fields for the RPC
    const ledgerEntry = {
      username: username,
      transaction_date: transactionTime,
      transaction_type: transactionTypeCode.charAt(0),
      amount: newAmount,
      opening_balance: currentBalance,
      closing_balance: newBalance,
      description: description || `Credit top up of ${newAmount}`,
      last_exp_date: currentExpiryDate.toISOString(),
      exp_date: newExpiryDate.toISOString(),
      payment_method: paymentMethodCode.charAt(0),
      trans_credit: newAmount,
      agent: agentCode.charAt(0),
      status: 'C' // C for Completed, single character
    };
    
    console.log(`Creating credit ledger entry with data:`, {
      username: ledgerEntry.username,
      transaction_type: ledgerEntry.transaction_type,
      amount: ledgerEntry.amount,
      payment_method: ledgerEntry.payment_method,
      description: ledgerEntry.description
    });
    
    // Add additional validation to ensure all potential character(1) fields are properly formatted
    const { data: validatedEntry, changes } = ensureSingleCharFields(ledgerEntry);
    if (changes) {
      console.log('Made changes to ledger entry fields to ensure single character values');
      console.log('Original:', ledgerEntry);
      console.log('Validated:', validatedEntry);
      
      // Use the validated entry
      Object.assign(ledgerEntry, validatedEntry);
    }
      let ledgerId = 'unknown';
    try {
      // Final safety check before sending to database
      const finalValidation = ensureSingleCharFields(ledgerEntry);
      if (finalValidation.changes) {
        console.log('FINAL CHECK: Additional changes made to ensure single character values');
        console.log('Before:', ledgerEntry);
        Object.assign(ledgerEntry, finalValidation.data);
        console.log('After:', ledgerEntry);
      }
          // Log the data being sent to the RPC function
      console.log('Calling add_credit_ledger RPC with data:', JSON.stringify({
        p_username: ledgerEntry.username,
        p_amount: ledgerEntry.amount,
        p_description: ledgerEntry.description,
        p_payment_method: ledgerEntry.payment_method,
        p_trans_credit: ledgerEntry.trans_credit,
        p_transaction_type: ledgerEntry.transaction_type,
        p_agent: ledgerEntry.agent
      }, null, 2));
      
      // Call the add_credit_ledger RPC function
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/add_credit_ledger`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          p_username: ledgerEntry.username,
          p_amount: ledgerEntry.amount,
          p_description: ledgerEntry.description,
          p_payment_method: ledgerEntry.payment_method, 
          p_trans_credit: ledgerEntry.trans_credit,
          p_transaction_type: ledgerEntry.transaction_type,
          p_agent: ledgerEntry.agent
        })
      });
        if (!rpcResponse.ok) {
        const errorText = await rpcResponse.text();
        console.error(`RPC add_credit_ledger failed: ${rpcResponse.status} ${errorText}`);
        throw new Error(`Error calling add_credit_ledger RPC function: ${rpcResponse.status} ${errorText}`);
      }
        // Get the response text first to check if it's valid
      const responseText = await rpcResponse.text();
      console.log('Raw RPC response text:', responseText);
      
      let rpcResult = null;
      let ledgerId = 'unknown';
      
      // Try to parse the response JSON if it exists
      if (responseText && responseText.trim() !== '') {
        try {
          rpcResult = JSON.parse(responseText);
          console.log('RPC add_credit_ledger result:', rpcResult);
          // Extract the ledger ID from the result
          ledgerId = rpcResult?.id || rpcResult?.ledger_id || 'generated-automatically';
        } catch (parseError) {
          console.warn('Non-fatal error parsing RPC response as JSON:', parseError);
          // Continue with empty result - the update may have succeeded server-side
        }
      } else {
        console.log('RPC returned empty response but status was OK, assuming transaction succeeded');
      }
      
      // Log the result of the operation
      console.log(`Created ledger entry with ID: ${ledgerId} (derived from ${rpcResult ? 'response' : 'generated'})`);
    } catch (e) {
      console.error('Error creating ledger entry:', e);
      throw new Error(`Failed to create transaction record: ${e.message}`);
    }
    
    // Step 3: Update client balance
    const updateSuccess = await updateClientBalance(
      username, 
      clientInfo, 
      newBalance, 
      newExpiryDate, 
      transactionTime, 
      supabaseUrl, 
      supabaseKey
    );
    
    if (!updateSuccess) {
      console.warn('Warning: Could not update client record with new balance, but ledger entry was created.');
    }
      // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Credit topped up successfully via add_credit_ledger RPC",
      data: {
        transaction_id: ledgerId,
        previous_balance: currentBalance,
        amount_added: newAmount,
        new_balance: newBalance,
        previous_expiry: currentExpiryDate.toISOString(),
        new_expiry: newExpiryDate.toISOString(),
        profile_update_status: updateSuccess ? "success" : "auto-updated by RPC, fallback verification: warning"
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error processing top up:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while processing the top up",
      error_details: error.toString()
    }), {
      status: error.message?.includes('not found') ? 404 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

async function handlePurchaseTransaction(data, supabaseUrl, supabaseKey, corsHeaders) {
  const { username, amount, order_id, item_name, item_code, quantity, unit_price, description } = data;
  
  if (!username || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return new Response(JSON.stringify({
      success: false,
      message: "Valid username and amount are required"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  try {
    // Step 1: Find the client
    const clientInfo = await findClientByUsername(username, supabaseUrl, supabaseKey);
    const { currentBalance, currentExpiryDate } = clientInfo;
    
    console.log(`Found client data: ${JSON.stringify(clientInfo.client)}`);
    
    // Calculate new balance (deduct for purchase)
    const purchaseAmount = parseFloat(amount);
    
    // Check if client has enough balance
    if (currentBalance < purchaseAmount) {
      return new Response(JSON.stringify({
        success: false,
        message: "Insufficient credit balance",
        data: {
          current_balance: currentBalance,
          purchase_amount: purchaseAmount,
          shortfall: purchaseAmount - currentBalance
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const newBalance = currentBalance - purchaseAmount;
    
    // Keep the same expiry date for purchases
    const newExpiryDate = new Date(currentExpiryDate);
    
    // Begin a transaction - first create a ledger entry
    const transactionTime = new Date().toISOString();
      // Step 2: Create ledger entry for PURCHASE using our utility functions
    const paymentMethodCode = convertPaymentMethodToCode(data.payment_method);
    const agentCode = data.agent ? 
      (data.agent.length === 1 ? data.agent : data.agent.charAt(0)) : 'W'; // W for Web
    const statusCode = 'C'; // Default to C for Completed
    
    // This object maintains compatibility with the old code but we'll only use specific fields for the RPC
    const ledgerEntry = {
      username: username,
      transaction_date: transactionTime,
      transaction_type: 'P', // P for PURCHASE, single character
      amount: purchaseAmount,
      opening_balance: currentBalance,
      closing_balance: newBalance,
      description: description || `Purchase: ${item_name || 'Unknown item'}`,
      last_exp_date: currentExpiryDate.toISOString(),
      exp_date: newExpiryDate.toISOString(),
      payment_method: paymentMethodCode.charAt(0), // Ensure it's a single character
      trans_credit: -purchaseAmount, // Negative for purchases
      agent: agentCode.charAt(0), // Ensure it's always a single character
      status: statusCode.charAt(0), // Ensure it's always a single character
      order_id: order_id || null,
      item_name: item_name || null,
      item_code: item_code || null,
      quantity: quantity || 1,
      unit_price: unit_price || purchaseAmount
    };
    
    console.log(`Creating PURCHASE ledger entry with data:`, {
      username: ledgerEntry.username,
      transaction_type: ledgerEntry.transaction_type,
      amount: ledgerEntry.amount,
      payment_method: ledgerEntry.payment_method,
      description: ledgerEntry.description
    });
    
    // Add validation to ensure all potential character(1) fields are properly formatted
    const { data: validatedEntry, changes } = ensureSingleCharFields(ledgerEntry);
    if (changes) {
      console.log('Made changes to ledger entry fields to ensure single character values');
      console.log('Original:', ledgerEntry);
      console.log('Validated:', validatedEntry);
      
      // Use the validated entry
      Object.assign(ledgerEntry, validatedEntry);
    }
    
    let ledgerId = 'unknown';
    
    try {
      // Final safety check before sending to database
      const finalValidation = ensureSingleCharFields(ledgerEntry);
      if (finalValidation.changes) {
        console.log('FINAL CHECK: Additional changes made to ensure single character values');
        console.log('Before:', ledgerEntry);
        Object.assign(ledgerEntry, finalValidation.data);
        console.log('After:', ledgerEntry);
      }
        // Log the data being sent to the RPC function
      console.log('Calling add_credit_ledger RPC with PURCHASE data:', JSON.stringify({
        p_username: ledgerEntry.username,
        p_amount: ledgerEntry.amount,
        p_description: ledgerEntry.description,
        p_payment_method: ledgerEntry.payment_method,
        p_trans_credit: ledgerEntry.trans_credit,
        p_transaction_type: ledgerEntry.transaction_type,
        p_agent: ledgerEntry.agent
      }, null, 2));
      
      // Call the add_credit_ledger RPC function
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/add_credit_ledger`, {
        method: 'POST',
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          p_username: ledgerEntry.username,
          p_amount: ledgerEntry.amount,
          p_description: ledgerEntry.description,
          p_payment_method: ledgerEntry.payment_method, 
          p_trans_credit: ledgerEntry.trans_credit,
          p_transaction_type: ledgerEntry.transaction_type,
          p_agent: ledgerEntry.agent
        })
      });
        if (!rpcResponse.ok) {
        const errorText = await rpcResponse.text();
        console.error(`RPC add_credit_ledger failed for PURCHASE: ${rpcResponse.status} ${errorText}`);
        throw new Error(`Error calling add_credit_ledger RPC function for PURCHASE: ${rpcResponse.status} ${errorText}`);
      }
        // Get the response text first to check if it's valid
      const responseText = await rpcResponse.text();
      console.log('Raw RPC response text (PURCHASE):', responseText);
      
      let rpcResult = null;
      let ledgerId = 'unknown';
      
      // Try to parse the response JSON if it exists
      if (responseText && responseText.trim() !== '') {
        try {
          rpcResult = JSON.parse(responseText);
          console.log('RPC add_credit_ledger result for PURCHASE:', rpcResult);
          // Extract the ledger ID from the result
          ledgerId = rpcResult?.id || rpcResult?.ledger_id || 'generated-automatically';
        } catch (parseError) {
          console.warn('Non-fatal error parsing RPC response as JSON (PURCHASE):', parseError);
          // Continue with empty result - the update may have succeeded server-side
        }
      } else {
        console.log('RPC returned empty response for PURCHASE but status was OK, assuming transaction succeeded');
      }
      
      // Log the result of the operation
      console.log(`Created PURCHASE ledger entry with ID: ${ledgerId} (derived from ${rpcResult ? 'response' : 'generated'})`);
      
      // Extract the ledger ID from the result
      ledgerId = rpcResult?.id || rpcResult?.ledger_id || 'unknown';
      console.log(`Successfully created PURCHASE ledger entry with ID: ${ledgerId}`);
    } catch (e) {
      console.error('Error creating PURCHASE ledger entry:', e);
      throw new Error(`Failed to create transaction record: ${e.message}`);
    }
    
    // Step 3: Update client balance with reduced amount
    const updateSuccess = await updateClientBalance(
      username, 
      clientInfo, 
      newBalance, 
      newExpiryDate, 
      transactionTime, 
      supabaseUrl, 
      supabaseKey
    );
    
    if (!updateSuccess) {
      console.warn('Warning: Could not update client record with new balance, but PURCHASE ledger entry was created.');
    }
      // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Purchase transaction completed successfully via add_credit_ledger RPC",
      data: {
        transaction_id: ledgerId,
        previous_balance: currentBalance,
        amount_deducted: purchaseAmount,
        new_balance: newBalance,
        expiry_date: newExpiryDate.toISOString(),
        profile_update_status: updateSuccess ? "success" : "auto-updated by RPC, fallback verification: warning",
        order_id: order_id || null,
        item_details: {
          name: item_name || 'Unknown item',
          code: item_code || null,
          quantity: quantity || 1,
          unit_price: unit_price || purchaseAmount
        }
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error processing purchase transaction:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred while processing the purchase",
      error_details: error.toString()
    }), {
      status: error.message?.includes('not found') ? 404 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Common function to find a client by username
async function findClientByUsername(username, supabaseUrl, supabaseKey) {
  console.log(`Fetching client data for username: ${username}`);
  let clientData = [];
  let client = null;
  
  // Try all possible combinations of table and field names
  const possibleQueries = [
    { table: 'userfile', field: 'USERNAME', operator: 'eq' },
    { table: 'userfile', field: 'username', operator: 'eq' },
    { table: 'userfile', field: 'USERNAME', operator: 'ilike' },
    { table: 'clients', field: 'USERNAME', operator: 'eq' },
    { table: 'clients', field: 'username', operator: 'eq' }
  ];
  
  for (const query of possibleQueries) {
    if (client) break; // Stop if we already found the client
    
    try {
      console.log(`Trying ${query.table} table with ${query.field} ${query.operator} ${username}`);
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${query.table}?${query.field}=${query.operator}.${encodeURIComponent(username)}`, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result && result.length > 0) {
          clientData = result;
          client = result[0];
          console.log(`Found client in ${query.table} using ${query.field}`);
          break;
        }
      } else {
        console.log(`Query failed for ${query.table}: ${response.status}`);
      }
    } catch (e) {
      console.error(`Error querying ${query.table}:`, e);
    }
  }
  
  if (!client) {
    throw new Error(`Client not found with username: ${username}`);
  }
  
  // Get client details - attempt to normalize field names
  const clientId = client.CLIENT_ID || client.client_id || client.id || client.ID;
  const currentBalance = parseFloat(client.CREDIT_BALANCE || client.credit_balance || 0);
  const currentExpiryDateStr = client.EXP_DATE || client.exp_date || new Date().toISOString();
  const currentExpiryDate = new Date(currentExpiryDateStr);
  
  return {
    client,
    clientId,
    currentBalance,
    currentExpiryDate,
    isUserfile: client.hasOwnProperty('USERNAME') || client.hasOwnProperty('username')
  };
}

// Common function to update client credit balance (will become a fallback method)
async function updateClientBalance(username, clientInfo, newBalance, newExpiryDate, transactionTime, supabaseUrl, supabaseKey) {
  // With the new RPC implementation, the balance should already be updated
  // This function is now a fallback in case we still need to update the profile
  console.log('Note: Client balance should already be updated by the add_credit_ledger RPC function.');
  console.log('Running updateClientBalance as a fallback verification step.');
  
  const { client, clientId, isUserfile } = clientInfo;
  
  const updateDataUpper = {
    CREDIT_BALANCE: newBalance,
    EXP_DATE: newExpiryDate.toISOString(),
    UPDATED_AT: transactionTime
  };
  
  const updateDataLower = {
    credit_balance: newBalance,
    exp_date: newExpiryDate.toISOString(),
    updated_at: transactionTime
  };
  
  // Try to update in different tables with different field casings
  const updateAttempts = [
    { table: 'userfile', queryField: 'USERNAME', data: updateDataUpper },
    { table: 'userfile', queryField: 'username', data: updateDataUpper },
    { table: 'clients', queryField: 'USERNAME', data: updateDataUpper },
    { table: 'clients', queryField: 'username', data: updateDataUpper },
    { table: 'userfile', queryField: 'USERNAME', data: updateDataLower },
    { table: 'userfile', queryField: 'username', data: updateDataLower },
    { table: 'clients', queryField: 'USERNAME', data: updateDataLower },
    { table: 'clients', queryField: 'username', data: updateDataLower },
  ];
  
  // If we know exactly which table the client was found in
  const tableToUpdate = isUserfile ? 'userfile' : 'clients';
  const preferredAttempts = updateAttempts.filter(attempt => attempt.table === tableToUpdate);
  
  let updateSuccess = false;
  
  // First try preferred table
  for (const attempt of preferredAttempts) {
    if (updateSuccess) break;
    
    try {
      console.log(`Updating client in ${attempt.table} using ${attempt.queryField}`);
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/${attempt.table}?${attempt.queryField}=eq.${encodeURIComponent(username)}`, {
          method: 'PATCH',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(attempt.data)
        }
      );
      
      if (updateResponse.ok) {
        console.log(`Successfully updated client balance in ${attempt.table}`);
        updateSuccess = true;
        break;
      } else {
        const errorText = await updateResponse.text();
        console.error(`Warning: Update failed in ${attempt.table}: ${updateResponse.status} ${errorText}`);
      }
    } catch (e) {
      console.error(`Error updating ${attempt.table}:`, e);
    }
  }
  
  // If preferred attempts failed, try all others
  if (!updateSuccess) {
    for (const attempt of updateAttempts) {
      if (updateSuccess) break;
      if (attempt.table === tableToUpdate) continue; // Skip already tried
      
      try {
        console.log(`Trying alternative update in ${attempt.table} using ${attempt.queryField}`);
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/${attempt.table}?${attempt.queryField}=eq.${encodeURIComponent(username)}`, {
            method: 'PATCH',
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify(attempt.data)
          }
        );
        
        if (updateResponse.ok) {
          console.log(`Successfully updated client balance in ${attempt.table}`);
          updateSuccess = true;
          break;
        }
      } catch (e) {
        console.error(`Error in alternative update ${attempt.table}:`, e);
      }
    }
  }
  
  // If ID is available, try ID-based update as last resort
  if (!updateSuccess && clientId) {
    try {
      const idUpdateResponse = await fetch(
        `${supabaseUrl}/rest/v1/${tableToUpdate}?id=eq.${encodeURIComponent(clientId)}`, {
          method: 'PATCH',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(isUserfile ? updateDataUpper : updateDataLower)
        }
      );
      
      if (idUpdateResponse.ok) {
        console.log(`Successfully updated client balance by ID in ${tableToUpdate}`);
        updateSuccess = true;
      }
    } catch (e) {
      console.error('Error updating by ID:', e);
    }
  }
  
  return updateSuccess;
}