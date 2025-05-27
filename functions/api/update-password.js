// API endpoint to handle password reset
import { getSupabase } from './_supabaseClient.js';

// Debug logger specifically for password update flow
function updateDebugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[UPDATE-PWD-DEBUG ${timestamp}] ${message}`);
  if (data) {
    // Don't log sensitive data like tokens or passwords
    if (data.token) {
      const tokenLength = data.token.length;
      const tokenPreview = data.token.substring(0, 5) + '...' + data.token.substring(tokenLength - 5);
      data = { ...data, token: tokenPreview + ` (${tokenLength} chars)` };
    }
    if (data.password) {
      data = { ...data, password: '********' };
    }
    if (data.resetCode) {
      data = { ...data, resetCode: '******' };
    }
    console.log(JSON.stringify(data, null, 2));
  }
}

export async function onRequestPost(context) {
  try {
    const { request } = context;
    
    // Parse request body - now supports both token and code-based reset
    const { token, userId, password, resetCode, resetMethod = 'token' } = await request.json();
    
    updateDebugLog('Password reset request received', {
      resetMethod,
      hasToken: !!token,
      hasResetCode: !!resetCode,
      hasUserId: !!userId,
      hasPassword: !!password
    });
    
    // Validate inputs based on reset method
    if (resetMethod === 'token' && (!token || !userId || !password)) {
      updateDebugLog('Missing required parameters for token-based password reset');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: token, userId, and password are required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (resetMethod === 'code' && (!resetCode || !userId || !password)) {
      updateDebugLog('Missing required parameters for code-based password reset');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: resetCode, userId, and password are required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get Supabase client
    const supabase = getSupabase(context);
    
    // Query parameters based on reset method
    const queryParams = {
      user_id: userId
    };
    
    if (resetMethod === 'token') {
      queryParams.token = token;
    } else if (resetMethod === 'code') {
      queryParams.reset_code = resetCode;
    }
    
    updateDebugLog('Verifying reset credentials', {
      method: resetMethod,
      queryParams: {
        user_id: userId,
        has_token: resetMethod === 'token',
        has_code: resetMethod === 'code'
      }
    });
    
    // Verify token or code against the stored recovery data in the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq(resetMethod === 'token' ? 'token' : 'reset_code', resetMethod === 'token' ? token : resetCode)
      .single();
    
    if (tokenError || !tokenData) {
      updateDebugLog('Verification error', {
        error: tokenError?.message || 'No matching reset token found',
        method: resetMethod
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Invalid or expired reset ${resetMethod === 'token' ? 'token' : 'code'}. Please request a new password reset.` 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if token is expired
    const currentTime = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    updateDebugLog('Checking expiration', {
      currentTime: currentTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: currentTime > expiresAt
    });
    
    if (currentTime > expiresAt) {
      // Delete expired token
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('id', tokenData.id);
        
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Password reset ${resetMethod === 'token' ? 'token' : 'code'} has expired. Please request a new password reset.` 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    updateDebugLog('Attempting to update user password', { userId });
    
    // First check if the user is in the auth system
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (authUserError || !authUser) {
      updateDebugLog('User not found in auth system, checking userfile table', {
        error: authUserError?.message
      });
      
      // For compatibility with older system, if user not in Auth system, check userfile table
      const { data: userfileData, error: userfileError } = await supabase
        .from('userfile')
        .select('ID, USERNAME, PASSWORD_HASH')
        .eq('ID', userId)
        .single();
      
      if (userfileError || !userfileData) {
        updateDebugLog('User not found in userfile either', {
          error: userfileError?.message
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User not found. Please contact support.' 
          }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Update password in userfile table directly
      const { error: updateError } = await supabase
        .from('userfile')
        .update({
          PASSWORD_HASH: password, // Store password directly as in original system
          UPDATED_AT: new Date().toISOString()
        })
        .eq('ID', userId);
      
      if (updateError) {
        updateDebugLog('Password update error in userfile', {
          error: updateError.message
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update password. Please try again.' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // User is in auth system, update using Supabase auth
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password
      });
      
      if (updateError) {
        updateDebugLog('Password update error in auth system', {
          error: updateError.message
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update password. Please try again.' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Delete the used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('id', tokenData.id);
    
    updateDebugLog('Password updated successfully', {
      userId,
      method: resetMethod
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password successfully updated. You can now login with your new password.' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    updateDebugLog('Password reset error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An unexpected error occurred. Please try again.' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}