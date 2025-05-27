// filepath: d:\ServiceRun\FBoard\FoodBaoClient\functions\api\credit-crud.js
import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();
    
    // Get Supabase credentials from the central module
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    // Ensure we have required credentials
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
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
    
    // Parse URL to get parameters
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    
    // Handle request based on HTTP method
    try {
      if (request.method === "GET") {
        if (url.pathname.includes('credit-history')) {
          // Fetch credit history for a user
          return await fetchCreditHistory(username, supabaseUrl, supabaseKey, corsHeaders);
        } else {
          // Get credit balance for a user
          return await fetchCreditBalance(username, supabaseUrl, supabaseKey, corsHeaders);
        }
      } else if (request.method === "POST") {
        if (url.pathname.includes('credit-topup')) {
          // Top up credit balance
          return await processTopUp(request, supabaseUrl, supabaseKey, corsHeaders);
        } else if (url.pathname.includes('credit-deduct')) {
          // Deduct from credit balance
          return await processDeduction(request, supabaseUrl, supabaseKey, corsHeaders);
        } else {
          // Generic credit transaction
          return await processTransaction(request, supabaseUrl, supabaseKey, corsHeaders);
        }
      } else {
        // Method not allowed
        return new Response(JSON.stringify({
          success: false,
          message: `Method ${request.method} not allowed`
        }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (error) {
      console.error('Error in credit-crud handler:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "Server error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error in credit-crud handler:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "Server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to fetch credit history for a user
async function fetchCreditHistory(username, supabaseUrl, supabaseKey, corsHeaders) {
  if (!username) {
    return new Response(JSON.stringify({
      success: false,
      message: "Username is required"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    console.log(`Fetching credit history for username: ${username}`);
    
    // Attempt to fetch history directly from credit_ledgers using username
    console.log(`Querying credit_ledgers table by username: ${username}`);
    const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers?username=eq.${encodeURIComponent(username)}&order=transaction_date.desc`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    let ledgerEntries = [];
    if (ledgerResponse.ok) {
      ledgerEntries = await ledgerResponse.json();
      console.log(`Found ${ledgerEntries.length} credit history entries for username: ${username}`);
      
      if (ledgerEntries.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          data: ledgerEntries
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } else {
      console.error(`Error fetching from credit_ledgers by username: ${ledgerResponse.status}`);
    }

    // If no direct match was found, try case-insensitive search
    console.log(`Trying case-insensitive search in credit_ledgers for username: ${username}`);
    const insensitiveResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers?username=ilike.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (insensitiveResponse.ok) {
      const insensitiveEntries = await insensitiveResponse.json();
      if (insensitiveEntries.length > 0) {
        console.log(`Found ${insensitiveEntries.length} credit history entries with case-insensitive search`);
        return new Response(JSON.stringify({
          success: true,
          data: insensitiveEntries
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    // If still no entries found, return empty list with success (not an error)
    console.log('No credit history found for username:', username);
    return new Response(JSON.stringify({
      success: true,
      message: "No history found",
      data: []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to fetch current credit balance for a user
async function fetchCreditBalance(username, supabaseUrl, supabaseKey, corsHeaders) {
  if (!username) {
    return new Response(JSON.stringify({
      success: false,
      message: "Username is required"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  try {
    // Fetch user record from userfile
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Error fetching user data: ${userResponse.status} ${errorText}`);
    }
    
    const userData = await userResponse.json();
    
    if (!userData || userData.length === 0) {
      throw new Error("User not found");
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        credit_balance: userData[0].CREDIT_BALANCE || 0,
        expiry_date: userData[0].EXP_DATE || null
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to process a credit top-up
async function processTopUp(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    const data = await request.json();
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
    
    // Step 1: Fetch current client data - try multiple ways to find the user
    console.log(`Fetching client data for username: ${username}`);
    
    // First try the userfile table with USERNAME comparison
    const clientResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    let clientData = [];
    
    if (clientResponse.ok) {
      clientData = await clientResponse.json();
    }
    
    // If not found, try with case-insensitive username
    if (!clientData || clientData.length === 0) {
      console.log(`User not found with exact USERNAME match, trying ilike search for: ${username}`);
      
      const caseInsensitiveResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=ilike.${encodeURIComponent(username)}`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (caseInsensitiveResponse.ok) {
        clientData = await caseInsensitiveResponse.json();
      }
    }
    
    // If still not found, try the clients table
    if (!clientData || clientData.length === 0) {
      console.log(`User not found in userfile table, trying clients table for: ${username}`);
      
      const clientsTableResponse = await fetch(`${supabaseUrl}/rest/v1/clients?USERNAME=eq.${encodeURIComponent(username)}`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (clientsTableResponse.ok) {
        clientData = await clientsTableResponse.json();
      }
    }
    
    // If client data is empty after all attempts
    if (!clientData || clientData.length === 0) {
      throw new Error(`Client not found with username: ${username}`);
    }
    
    const client = clientData[0];
    console.log(`Found client data: ${client.USERNAME || client.username}, ID: ${client.CLIENT_ID || client.ID}`);
    
    const clientId = client.CLIENT_ID || client.ID;
    const currentBalance = parseFloat(client.CREDIT_BALANCE || client.credit_balance || 0);
    const currentExpiryDate = client.EXP_DATE || client.exp_date ? new Date(client.EXP_DATE || client.exp_date) : new Date();
    
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
    
    // Step 2: Create ledger entry
    const ledgerEntry = {
      username: username,
      transaction_date: transactionTime,
      transaction_type: transaction_type || 'TOP_UP',
      amount: newAmount,
      opening_balance: currentBalance,
      closing_balance: newBalance,
      description: description || `Credit top up of ${newAmount}`,
      last_exp_date: currentExpiryDate.toISOString(),
      exp_date: newExpiryDate.toISOString(),
      payment_method: payment_method || 'OTHER',
      trans_credit: newAmount,
      agent: data.agent || 'WEB'
    };
    
    console.log(`Creating credit ledger entry: ${JSON.stringify(ledgerEntry)}`);
    
    const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers`, {
      method: 'POST',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(ledgerEntry)
    });
    
    if (!ledgerResponse.ok) {
      const errorText = await ledgerResponse.text();
      throw new Error(`Error creating ledger entry: ${ledgerResponse.status} ${errorText}`);
    }
    
    // Step 3: Update client record with new balance and expiry date
    // Since we might have found the record in different tables, check which table to update
    const updateData = {
      CREDIT_BALANCE: newBalance,
      EXP_DATE: newExpiryDate.toISOString(),
      UPDATED_AT: transactionTime
    };
    
    // Use lowercase field names for clients table
    const updateDataLowercase = {
      credit_balance: newBalance,
      exp_date: newExpiryDate.toISOString(),
      updated_at: transactionTime
    };
    
    console.log(`Updating credit balance to ${newBalance} and expiry to ${newExpiryDate.toISOString()}`);
    
    // Determine which table to update based on where we found the record
    const tableToUpdate = client.hasOwnProperty('USERNAME') ? 'userfile' : 'clients';
    const fieldCasing = client.hasOwnProperty('USERNAME') ? updateData : updateDataLowercase;
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/${tableToUpdate}?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(fieldCasing)
    });
    
    if (!updateResponse.ok) {
      // Log the error but continue since the ledger entry was created
      const errorText = await updateResponse.text();
      console.error(`Warning: Error updating client balance in ${tableToUpdate}: ${updateResponse.status} ${errorText}`);
      
      // Try alternative field for username if first attempt failed
      if (tableToUpdate === 'userfile') {
        console.log(`Retrying update with lowercase username field in ${tableToUpdate}`);
        
        const retryResponse = await fetch(`${supabaseUrl}/rest/v1/${tableToUpdate}?username=eq.${encodeURIComponent(username)}`, {
          method: 'PATCH',
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(fieldCasing)
        });
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error(`Error in retry attempt: ${retryResponse.status} ${retryErrorText}`);
        } else {
          console.log(`Successfully updated client balance in ${tableToUpdate} with lowercase username field`);
        }
      }
    } else {
      console.log(`Successfully updated client balance in ${tableToUpdate}`);
    }
    
    // Get the new ledger entry ID
    const ledgerEntries = await ledgerResponse.json();
    const ledgerId = ledgerEntries[0]?.id || 'unknown';
    
    return new Response(JSON.stringify({
      success: true,
      message: "Credit topped up successfully",
      data: {
        transaction_id: ledgerId,
        previous_balance: currentBalance,
        amount_added: newAmount,
        new_balance: newBalance,
        previous_expiry: currentExpiryDate.toISOString(),
        new_expiry: newExpiryDate.toISOString()
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error processing top up:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Function to process a credit deduction
async function processDeduction(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    const data = await request.json();
    const { username, amount, description } = data;
    
    if (!username || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Valid username and amount are required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Step 1: Fetch current client data
    const clientResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      throw new Error(`Error fetching client data: ${clientResponse.status} ${errorText}`);
    }
    
    const clientData = await clientResponse.json();
    
    if (!clientData || clientData.length === 0) {
      throw new Error(`Client not found with username: ${username}`);
    }
    
    const client = clientData[0];
    const currentBalance = parseFloat(client.CREDIT_BALANCE || 0);
    const deductAmount = parseFloat(amount);
    
    // Check if client has sufficient balance
    if (currentBalance < deductAmount) {
      return new Response(JSON.stringify({
        success: false,
        message: "Insufficient credit balance",
        data: {
          current_balance: currentBalance,
          required_amount: deductAmount
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Calculate new balance
    const newBalance = currentBalance - deductAmount;
    
    // Begin a transaction - first create a ledger entry
    const transactionTime = new Date().toISOString();
    
    // Step 2: Create ledger entry
    const ledgerEntry = {
      username: username,
      transaction_date: transactionTime,
      transaction_type: data.transaction_type || 'DEBIT',
      amount: deductAmount,
      opening_balance: currentBalance,
      closing_balance: newBalance,
      description: description || `Credit deduction of ${deductAmount}`,
      last_exp_date: client.EXP_DATE,
      exp_date: client.EXP_DATE,
      trans_credit: -deductAmount,
      agent: data.agent || 'WEB'
    };
    
    const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers`, {
      method: 'POST',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(ledgerEntry)
    });
    
    if (!ledgerResponse.ok) {
      const errorText = await ledgerResponse.text();
      throw new Error(`Error creating ledger entry: ${ledgerResponse.status} ${errorText}`);
    }
    
    // Step 3: Update client record with new balance
    const updateData = {
      CREDIT_BALANCE: newBalance,
      UPDATED_AT: transactionTime
    };
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/userfile?USERNAME=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error updating client balance: ${updateResponse.status} ${errorText}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Credit deducted successfully",
      data: {
        transaction_id: (await ledgerResponse.json())[0].id,
        previous_balance: currentBalance,
        amount_deducted: deductAmount,
        new_balance: newBalance
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error('Error processing deduction:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Generic function to process any type of credit transaction
async function processTransaction(request, supabaseUrl, supabaseKey, corsHeaders) {
  try {
    const data = await request.json();
    const { username, amount, transaction_type } = data;
    
    if (!username || !amount || !transaction_type) {
      return new Response(JSON.stringify({
        success: false,
        message: "Username, amount, and transaction_type are required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Based on transaction_type, call the appropriate function
    if (transaction_type === 'TOP_UP' || transaction_type === 'CREDIT') {
      return await processTopUp(request, supabaseUrl, supabaseKey, corsHeaders);
    } else if (transaction_type === 'DEBIT') {
      return await processDeduction(request, supabaseUrl, supabaseKey, corsHeaders);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: `Unsupported transaction type: ${transaction_type}`
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('Error processing transaction:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}