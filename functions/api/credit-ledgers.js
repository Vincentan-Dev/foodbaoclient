import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept GET/POST requests
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
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

    // GET request - fetch credit ledger entries
    if (request.method === "GET") {
      const url = new URL(request.url);
      const username = url.searchParams.get('username');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const transactionType = url.searchParams.get('transactionType');

      // Username is required
      if (!username) {
        return new Response(JSON.stringify({
          success: false,
          message: "Username parameter is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Build query filters
      let query = `username=eq.${encodeURIComponent(username)}`;
      
      if (startDate) {
        query += `&transaction_date=gte.${startDate}`;
      }
      
      if (endDate) {
        // Add one day to include the entire end day
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        const formattedEndDate = endDateTime.toISOString().split('T')[0];
        query += `&transaction_date=lt.${formattedEndDate}`;
      }
      
      if (transactionType) {
        query += `&transaction_type=eq.${transactionType}`;
      }
      
      // Order by transaction date descending
      query += '&order=transaction_date.desc';

      try {
        // Fetch ledger entries
        const response = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers?${query}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching ledger: ${response.status} - ${errorText}`);
          throw new Error(`Database error: ${response.status}`);
        }

        const ledgerEntries = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: ledgerEntries
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (error) {
        console.error("Error fetching ledger:", error);
        throw error;
      }
    }
    
    // POST request - create new ledger entry
    else if (request.method === "POST") {
      console.log("Processing credit ledger transaction POST request");
      
      try {
        const requestData = await request.json();
        console.log("Request data:", JSON.stringify(requestData));
        
        // Validate required fields
        if (!requestData.username) {
          return new Response(JSON.stringify({
            success: false,
            message: "Username is required",
            toast: {
              type: 'error',
              message: "Username is required",
              position: 'center'
            }
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        if (requestData.amount === undefined || isNaN(parseFloat(requestData.amount))) {
          return new Response(JSON.stringify({
            success: false,
            message: "Valid amount is required",
            toast: {
              type: 'error',
              message: "Please enter a valid transaction amount",
              position: 'center'
            }
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        if (!requestData.transaction_type || !['CREDIT', 'DEBIT', 'ADJUSTMENT'].includes(requestData.transaction_type)) {
          return new Response(JSON.stringify({
            success: false,
            message: "Valid transaction type is required (CREDIT, DEBIT, or ADJUSTMENT)",
            toast: {
              type: 'error',
              message: "Invalid transaction type",
              position: 'center'
            }
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // 1. Get current credit balance
        console.log(`Fetching client info for username: ${requestData.username}`);
        const clientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?USERNAME=eq.${encodeURIComponent(requestData.username.trim())}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });

        if (!clientResponse.ok) {
          console.error(`Client fetch error: ${clientResponse.status}`);
          throw new Error(`Failed to get client info: ${clientResponse.status}`);
        }

        const clientData = await clientResponse.json();
        console.log(`Client data response:`, clientData);
        
        if (!clientData || !clientData.length) {
          return new Response(JSON.stringify({
            success: false,
            message: "Client not found",
            toast: {
              type: 'error',
              message: "Client not found in database",
              position: 'center'
            }
          }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const client = clientData[0];
        const currentBalance = parseFloat(client.CREDIT_BALANCE || 0);
        const amount = parseFloat(requestData.amount);
        
        // Calculate new balance based on transaction type
        let newBalance = currentBalance;
        
        if (requestData.transaction_type === "ADJUSTMENT") {
          newBalance = amount; // Set to specific amount
        } else {
          newBalance = currentBalance + amount; // Credit or debit (amount is negative for debit)
        }
        
        console.log(`Transaction calculation: Current balance: ${currentBalance}, Amount: ${amount}, New balance: ${newBalance}`);
        
        // 2. Create ledger entry
        const ledgerEntry = {
          username: requestData.username,
          transaction_type: requestData.transaction_type,
          amount: amount,
          opening_balance: currentBalance,
          closing_balance: newBalance,
          description: requestData.description || `${requestData.transaction_type} transaction`
        };
        
        console.log("Creating ledger entry:", JSON.stringify(ledgerEntry));
        const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/credit_ledgers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify(ledgerEntry)
        });

        if (!ledgerResponse.ok) {
          const errorText = await ledgerResponse.text();
          console.error(`Ledger creation error: ${ledgerResponse.status} - ${errorText}`);
          throw new Error(`Failed to create ledger entry: ${ledgerResponse.status} - ${errorText}`);
        }
        
        // 3. Update client balance
        console.log(`Updating client balance to: ${newBalance}`);
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/clients?USERNAME=eq.${encodeURIComponent(requestData.username.trim())}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            CREDIT_BALANCE: newBalance,
            UPDATED_AT: new Date().toISOString()
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Client update error: ${updateResponse.status} - ${errorText}`);
          throw new Error(`Failed to update client balance: ${updateResponse.status} - ${errorText}`);
        }
        
        console.log("Transaction completed successfully");
        
        // Return success response
        return new Response(JSON.stringify({
          success: true,
          message: "Transaction recorded successfully",
          data: {
            username: requestData.username,
            transaction_type: requestData.transaction_type,
            amount: amount,
            old_balance: currentBalance,
            new_balance: newBalance
          },
          toast: {
            type: 'success',
            message: 'Credit transaction recorded successfully',
            position: 'center'
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (error) {
        console.error("Transaction processing error:", error);
        throw error;
      }
    } 
  } catch (error) {
    console.error("API error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred",
      toast: {
        type: 'error',
        message: error.message || "Operation failed",
        position: 'center'
      }
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
