require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SUPABASE_KEY (length):', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test basic query
    console.log('Testing basic query...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
      
    if (tablesError) {
      console.error('Basic query error:', tablesError);
      return;
    }
    
    console.log('Basic query success:', tables);
    
    // Test the auth RPC function with test credentials
    console.log('Testing auth RPC function...');
    const { data, error } = await supabase.rpc('auth', {
      p_username: 'test',
      p_password: 'test'
    });
    
    console.log('Auth response:', data);
    if (error) console.error('Auth error:', error);
  } catch (e) {
    console.error('Test failed:', e);
  }
}

testSupabase();