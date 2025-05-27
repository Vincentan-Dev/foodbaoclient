// API endpoint to handle password reset requests
import { getSupabase } from './_supabaseClient.js';
import { sendPasswordResetEmail } from './email-service.js';
import { generateRandomCode, sendVerificationCode, storeVerificationCode } from './whatsapp-service.js';

// Generate a secure random token using Web Crypto API (compatible with Cloudflare Workers)
async function generateSecureToken(length = 32) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Debug logger specifically for password reset flow
function resetDebugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[RESET-DEBUG ${timestamp}] ${message}`);
  if (data) {
    // Don't log sensitive data like tokens completely
    if (data.token) {
      const tokenLength = data.token.length;
      const tokenPreview = data.token.substring(0, 5) + '...' + data.token.substring(tokenLength - 5);
      data = { ...data, token: tokenPreview + ` (${tokenLength} chars)` };
    }
    if (data.resetCode) {
      data = { ...data, resetCode: '******' };
    }
    console.log(JSON.stringify(data, null, 2));
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let responseData = { success: false, message: 'Unknown error' };
    
    resetDebugLog('Password reset request received', {
      url: request.url,
      method: request.method,
      headers: {
        origin: request.headers.get('origin'),
        host: request.headers.get('host'),
        referer: request.headers.get('referer')
      }
    });
    
    resetDebugLog('Environment check', {
      has_supabase_url: !!env.SUPABASE_URL,
      has_service_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
      email_service: env.EMAIL_SERVICE || '(not set)',
      email_service_keys: {
        has_sendgrid_key: !!env.SENDGRID_API_KEY,
        has_mailgun_key: !!env.MAILGUN_API_KEY,
        has_mailgun_domain: !!env.MAILGUN_DOMAIN,
        has_gmail_user: !!env.GMAIL_USER,
        has_gmail_pass: !!env.GMAIL_APP_PASSWORD,
        has_email_from: !!env.EMAIL_FROM
      },
      whatsapp_provider: env.WHATSAPP_PROVIDER || '(not set)',
      whatsapp_enabled: env.ENABLE_WHATSAPP_RESET === 'true'
    });
    
    const requestData = await request.json();
    const { email, phoneNumber, method = 'email' } = requestData;
    
    // Validate input based on selected method
    if (method === 'email' && !email) {
      resetDebugLog('Missing email in request');
      responseData = { 
        success: false, 
        message: 'Email is required for email reset method' 
      };
      return new Response(JSON.stringify(responseData), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'whatsapp' && !phoneNumber) {
      resetDebugLog('Missing phone number in request');
      responseData = { 
        success: false, 
        message: 'Phone number is required for WhatsApp reset method' 
      };
      return new Response(JSON.stringify(responseData), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'whatsapp' && env.ENABLE_WHATSAPP_RESET !== 'true') {
      resetDebugLog('WhatsApp reset requested but not enabled');
      responseData = { 
        success: false, 
        message: 'WhatsApp reset method is not available' 
      };
      return new Response(JSON.stringify(responseData), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    resetDebugLog('Starting password reset process', { 
      method,
      email: email || undefined,
      phoneNumberProvided: !!phoneNumber
    });
    
    // Get Supabase client
    resetDebugLog('Getting Supabase client');
    const supabase = getSupabase(context);
    
    // Check for authenticated user
    resetDebugLog('Checking for authenticated session');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      resetDebugLog('Session error', { error: sessionError.message });
      responseData = {
        success: false, 
        message: 'Authentication error. Please try logging in again.'
      };
      return new Response(JSON.stringify(responseData), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If there's an authenticated user, verify the contact info belongs to this user
    if (session && session.user) {
      resetDebugLog('User is authenticated, verifying user data matches session user', {
        sessionUserId: session.user.id,
        resetMethod: method
      });
      
      // Get user's profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, phone_number')
        .eq('id', session.user.id)
        .single();
      
      if (userError || !userData) {
        resetDebugLog('User profile fetch error', { error: userError?.message || 'No profile data found' });
        responseData = {
          success: false, 
          message: 'Could not verify user information. Please try again.'
        };
        return new Response(JSON.stringify(responseData), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      resetDebugLog('Retrieved user profile', { 
        sessionUserId: session.user.id,
        profileEmail: userData.email,
        hasPhoneNumber: !!userData.phone_number,
        requestedMethod: method,
        matches: method === 'email' ? userData.email === email : 
                 method === 'whatsapp' ? userData.phone_number === phoneNumber : false
      });
      
      // Check if requested contact info matches the user's contact info
      if ((method === 'email' && userData.email !== email) || 
          (method === 'whatsapp' && userData.phone_number !== phoneNumber)) {
        resetDebugLog('Contact info mismatch: requested contact does not match authenticated user');
        responseData = {
          success: false, 
          message: `The ${method === 'email' ? 'email address' : 'phone number'} does not match your account.`
        };
        return new Response(JSON.stringify(responseData), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Look up user based on the provided contact info
    let userId = null;
    let userContactInfo = null;
    
    if (method === 'email') {
      // Check if user exists in profiles table with this email
      resetDebugLog('Looking up user by email in profiles table');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (profileData) {
        userId = profileData.id;
        userContactInfo = profileData.email;
      } else {
        // If not found in profiles, check auth.users table
        resetDebugLog('Looking up user by email in auth.users table');
        const { data: authUserData, error: authUserError } = await supabase
          .from('auth.users')
          .select('id, email')
          .eq('email', email)
          .single();
        
        if (authUserData) {
          userId = authUserData.id;
          userContactInfo = authUserData.email;
        }
      }
    } else if (method === 'whatsapp') {
      // Check if user exists with this phone number
      resetDebugLog('Looking up user by phone number in profiles table');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('phone_number', phoneNumber)
        .single();
      
      if (profileData) {
        userId = profileData.id;
        userContactInfo = profileData.phone_number;
      }
      
      // Also check userfile table for older system
      if (!userId) {
        resetDebugLog('Looking up user by phone number in userfile table');
        const { data: userfileData, error: userfileError } = await supabase
          .from('userfile')
          .select('ID, PHONE')
          .eq('PHONE', phoneNumber)
          .single();
        
        if (userfileData) {
          userId = userfileData.ID;
          userContactInfo = userfileData.PHONE;
        }
      }
    }
    
    resetDebugLog('User lookup results', {
      method,
      userId,
      userFound: !!userId,
      contactInfoFound: !!userContactInfo
    });
    
    if (!userId) {
      // Don't reveal if contact info exists or not for security reasons
      resetDebugLog('No user found with the provided contact info');
      responseData = {
        success: true, 
        message: `If your ${method === 'email' ? 'email' : 'phone number'} is registered, you will receive password reset instructions shortly.`
      };
      return new Response(JSON.stringify(responseData), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Determine which type of token/code to generate based on reset method
    let token, resetCode;
    
    if (method === 'email') {
      // For email, generate a secure random token for URL
      token = await generateSecureToken();
      resetDebugLog('Generated password reset token for email', { userId, token });
    } else {
      // For WhatsApp, generate a numeric code that's easy to type
      resetCode = generateRandomCode(6); // 6-digit code
      token = await generateSecureToken(); // Still store a secure token in DB
      resetDebugLog('Generated numeric reset code for WhatsApp', { 
        userId, 
        token,
        hasResetCode: !!resetCode
      });
    }
    
    // Store token in the database
    resetDebugLog('Storing token in database');
    const expiryDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    // For WhatsApp method, we'll use the storeVerificationCode helper
    if (method === 'whatsapp') {
      const storeResult = await storeVerificationCode(userId, resetCode, context);
      
      if (!storeResult.success) {
        resetDebugLog('Token creation error', { error: storeResult.error });
        responseData = {
          success: false, 
          message: 'Failed to create verification code.'
        };
        return new Response(JSON.stringify(responseData), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // For email method, use the traditional token approach
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          token: token,
          reset_code: null,
          created_at: new Date().toISOString(),
          expires_at: expiryDate.toISOString(),
          reset_method: method
        });
      
      if (insertError) {
        resetDebugLog('Token creation error', { error: insertError.message });
        responseData = {
          success: false, 
          message: 'Failed to create password reset token.'
        };
        return new Response(JSON.stringify(responseData), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Construct reset URL for email or prepare code for WhatsApp
    const origin = request.headers.get('origin') || env.APP_URL || `https://${request.headers.get('host')}`;
    
    try {
      if (method === 'email') {
        // For email, send a reset link
        const resetUrl = `${origin}/reset-password.html?token=${token}&userId=${userId}`;
        resetDebugLog('Reset URL generated for email', { 
          origin, 
          resetUrl,
          expiryDate: expiryDate.toISOString()
        });
        
        // Send email with reset link
        resetDebugLog('Calling email service to send reset email');
        const emailResult = await sendPasswordResetEmail({
          email: userContactInfo,
          resetUrl: resetUrl
        }, context);
        
        resetDebugLog('Email send result', { emailResult });
        
        responseData = {
          success: true, 
          message: 'Password reset instructions have been sent to your email address.'
        };
      } else {
        // For WhatsApp, send a code
        resetDebugLog('Preparing WhatsApp message with reset code');
        
        // Create reset URL that will ask for the code
        const resetUrl = `${origin}/reset-password.html?method=code&userId=${userId}`;
        
        // Send WhatsApp message with code
        const whatsappResult = await sendVerificationCode(userContactInfo, resetCode, context);
        
        resetDebugLog('WhatsApp send result', { whatsappResult });
        
        responseData = {
          success: whatsappResult.success, 
          message: whatsappResult.success 
            ? 'Password reset code has been sent to your WhatsApp.'
            : 'Failed to send WhatsApp message. Please try again or use email.',
          resetUrl: whatsappResult.success ? resetUrl : undefined // Send the URL in response for immediate redirection
        };
      }
      
      return new Response(JSON.stringify(responseData), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (sendError) {
      resetDebugLog('Message sending error', { 
        error: sendError.message,
        stack: sendError.stack,
        method
      });
      
      responseData = {
        success: false, 
        message: `Failed to send password reset ${method === 'email' ? 'email' : 'WhatsApp message'}. Please try again later.`
      };
      
      return new Response(JSON.stringify(responseData), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    resetDebugLog('Password reset request error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An unexpected error occurred. Please try again.',
        debug: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}