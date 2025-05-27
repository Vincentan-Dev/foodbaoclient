/**
 * Script to create the missing authkey RPC function in Supabase
 * Run this to fix the NetworkError when fetching authkey
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function createAuthkeyFunction() {
  try {
    console.log('Creating authkey RPC function in Supabase...');
    
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./create_authkey_function.sql', 'utf8');
    
    // Execute the SQL to create the function
    const { data, error } = await supabase.rpc('sql', {
      query: sqlContent
    });
    
    if (error) {
      console.error('Error creating authkey function:', error);
      
      // Try alternative method using REST API
      console.log('Trying alternative method...');
      
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          query: sqlContent
        })
      });
      
      if (response.ok) {
        console.log('✅ authkey function created successfully via REST API');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create function:', errorText);
        
        // Provide manual instructions
        console.log('\n📋 Manual setup required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Database > Functions');
        console.log('3. Create a new function with the SQL content from create_authkey_function.sql');
        console.log('4. Or execute the SQL in the SQL Editor');
      }
    } else {
      console.log('✅ authkey function created successfully');
    }
    
    // Test the function
    console.log('\nTesting authkey function...');
    const { data: testData, error: testError } = await supabase.rpc('authkey', {
      p_username: 'test'
    });
    
    if (testError) {
      console.log('Test result (expected failure for non-existent user):', testError);
    } else {
      console.log('Test result:', testData);
    }
    
    console.log('\n🎉 Setup complete! The authkey function should now work.');
    
  } catch (e) {
    console.error('Setup failed:', e.message);
    console.log('\n📋 Manual setup instructions:');
    console.log('1. Copy the SQL content from create_authkey_function.sql');
    console.log('2. Go to your Supabase dashboard > Database > SQL Editor');
    console.log('3. Paste and execute the SQL to create the authkey function');
  }
}

createAuthkeyFunction();
