// Add this function to check if the credit_ledgers table exists
export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Get Supabase credentials
    const supabaseUrl = env.SUPABASE_URL || "https://icqbjfixyidhhrpnekdl.supabase.co";
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase API key"
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Check if credit_ledgers table exists
    const tablesResponse = await fetch(
      `${supabaseUrl}/rest/v1/information_schema/tables?table_schema=eq.public`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    
    const tables = await tablesResponse.json();
    
    // Find credit_ledgers table
    const creditLedgersTable = tables.find(t => t.table_name === 'credit_ledgers');
    
    if (!creditLedgersTable) {
      // Table doesn't exist - return SQL to create it
      const createTableSQL = `
CREATE TABLE credit_ledgers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  closing_balance DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'COMPLETED'
);

CREATE INDEX idx_credit_ledgers_client_id ON credit_ledgers(client_id);
CREATE INDEX idx_credit_ledgers_username ON credit_ledgers(username);
      `;
      
      return new Response(JSON.stringify({
        success: false,
        message: "credit_ledgers table does not exist",
        tables: tables.map(t => t.table_name),
        create_table_sql: createTableSQL
      }), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Check table columns
    const columnsResponse = await fetch(
      `${supabaseUrl}/rest/v1/information_schema/columns?table_schema=eq.public&table_name=eq.credit_ledgers`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
      const columns = await columnsResponse.json();
    
    // Format column data for better readability including constraints
    const formattedColumns = columns.map(col => {
      return {
        column_name: col.column_name,
        data_type: col.data_type,
        character_maximum_length: col.character_maximum_length,
        is_nullable: col.is_nullable,
        column_default: col.column_default,
        // Highlight potential single-character fields
        is_potential_char1: col.data_type === 'character' && col.character_maximum_length === 1
      };
    });
    
    // Find any character(1) columns that might be causing issues
    const charOneColumns = formattedColumns.filter(col => col.is_potential_char1);
    
    // Get a count of records
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/credit_ledgers?select=count`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "count=exact"
        }
      }
    );
    
    const countHeader = countResponse.headers.get('content-range');
    const totalCount = countHeader ? parseInt(countHeader.split('/')[1]) : 'unknown';
    
    // Get a sample record if any exist
    const sampleResponse = await fetch(
      `${supabaseUrl}/rest/v1/credit_ledgers?limit=1`,
      {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    
    const sampleRecords = await sampleResponse.json();
      return new Response(JSON.stringify({
      success: true,
      message: "credit_ledgers table exists",
      table_info: creditLedgersTable,
      columns: columns.map(c => ({ 
        name: c.column_name, 
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
        max_length: c.character_maximum_length,
        is_char1: c.data_type === 'character' && c.character_maximum_length === 1
      })),
      char1_columns: charOneColumns,
      record_count: totalCount,
      sample_record: sampleRecords.length > 0 ? sampleRecords[0] : null
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
    
  } catch (error) {
    console.error('Error checking credit_ledgers table:', error);
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