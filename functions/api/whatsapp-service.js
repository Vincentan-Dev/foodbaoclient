// WhatsApp Service API for sending messages via WhatsApp
// Uses an external provider to send WhatsApp messages
import { getSupabase } from './_supabaseClient.js';

/**
 * Logs WhatsApp service messages
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function whatsappLogger(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[WHATSAPP-SERVICE ${timestamp}] ${message}`);
  if (data) {
    // Mask sensitive data
    const sanitizedData = { ...data };
    if (sanitizedData.phoneNumber) {
      const length = sanitizedData.phoneNumber.length;
      sanitizedData.phoneNumber = sanitizedData.phoneNumber.substring(0, 3) + 
        '*'.repeat(length - 6) + 
        sanitizedData.phoneNumber.substring(length - 3);
    }
    if (sanitizedData.message && sanitizedData.message.includes('code is')) {
      sanitizedData.message = sanitizedData.message.replace(/\d{6}/g, '******');
    }
    console.log(JSON.stringify(sanitizedData, null, 2));
  }
}

/**
 * Sends a WhatsApp message using the configured provider
 * @param {string} phoneNumber - Full phone number with country code in international format
 * @param {string} message - The message to send
 * @param {Object} context - The Cloudflare Worker context object
 * @returns {Promise<Object>} - Response with success/error information
 */
export async function sendWhatsAppMessage(phoneNumber, message, context) {
  try {
    const { env } = context;
    const whatsappProvider = env.WHATSAPP_PROVIDER || 'mock';
    
    whatsappLogger('Sending WhatsApp message', {
      provider: whatsappProvider,
      phoneNumber,
      messageLength: message.length
    });
    
    // Normalize the phone number to international format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number format');
    }
    
    let result;
    
    // Send message based on configured provider
    switch (whatsappProvider.toLowerCase()) {
      case 'twilio':
        result = await sendViaTwilio(normalizedPhone, message, env);
        break;
        
      case 'meta':
      case 'facebook':
        result = await sendViaMeta(normalizedPhone, message, env);
        break;
        
      case 'mock':
      default:
        // For development/testing
        result = mockSendWhatsApp(normalizedPhone, message);
        break;
    }
    
    // Log the result
    whatsappLogger('WhatsApp message sent', {
      success: result.success,
      provider: whatsappProvider,
      phoneNumber: normalizedPhone,
      messageId: result.messageId || null
    });
    
    return result;
    
  } catch (error) {
    whatsappLogger('Error sending WhatsApp message', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mock WhatsApp sending for development environments
 * @param {string} phoneNumber - The phone number to send to
 * @param {string} message - The message content
 * @returns {Object} - Mock success response
 */
function mockSendWhatsApp(phoneNumber, message) {
  whatsappLogger('MOCK: Would have sent WhatsApp message', {
    phoneNumber,
    message
  });
  
  // Simulate a delay like a real API call would have
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        messageId: `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        provider: 'mock',
        message: 'Message would have been sent in production'
      });
    }, 500);
  });
}

/**
 * Send WhatsApp message via Twilio
 * @param {string} phoneNumber - The phone number to send to
 * @param {string} message - The message content
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Response with success/error information
 */
async function sendViaTwilio(phoneNumber, message, env) {
  try {
    const TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = env.TWILIO_WHATSAPP_FROM;
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error('Missing Twilio configuration');
    }
    
    // Create Basic Auth header for Twilio API
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    // Twilio WhatsApp API requires the 'whatsapp:' prefix
    const to = `whatsapp:${phoneNumber}`;
    const from = `whatsapp:${TWILIO_WHATSAPP_FROM}`;
    
    // Call Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Twilio API error: ${responseData.message || response.statusText}`);
    }
    
    return {
      success: true,
      messageId: responseData.sid,
      provider: 'twilio',
      status: responseData.status
    };
    
  } catch (error) {
    whatsappLogger('Error in Twilio send', { error: error.message });
    throw error;
  }
}

/**
 * Send WhatsApp message via Meta/Facebook WhatsApp Business API
 * @param {string} phoneNumber - The phone number to send to
 * @param {string} message - The message content
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Response with success/error information
 */
async function sendViaMeta(phoneNumber, message, env) {
  try {
    const META_WHATSAPP_TOKEN = env.META_WHATSAPP_TOKEN;
    const META_WHATSAPP_PHONE_ID = env.META_WHATSAPP_PHONE_ID;
    const META_WHATSAPP_VERSION = env.META_WHATSAPP_VERSION || 'v17.0';
    
    if (!META_WHATSAPP_TOKEN || !META_WHATSAPP_PHONE_ID) {
      throw new Error('Missing Meta WhatsApp configuration');
    }
    
    // Remove any whitespace and special chars from the phone
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Call Meta WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/${META_WHATSAPP_VERSION}/${META_WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(responseData.error || responseData)}`);
    }
    
    return {
      success: true,
      messageId: responseData.messages[0]?.id,
      provider: 'meta',
      status: 'sent'
    };
    
  } catch (error) {
    whatsappLogger('Error in Meta send', { error: error.message });
    throw error;
  }
}

/**
 * Normalize a phone number to E.164 format
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string|null} - Normalized phone number or null if invalid
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If the number starts with a leading 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Check if number already has country code (starts with +)
  if (phoneNumber.startsWith('+')) {
    return '+' + cleaned;
  }
  
  // If no country code, assume it's the default code (+60 for Malaysia)
  if (cleaned.length <= 12) {
    if (!cleaned.startsWith('60')) {
      return '+60' + cleaned;
    } else {
      return '+' + cleaned;
    }
  }
  
  // If we get here, it's probably already got a country code without the +
  return '+' + cleaned;
}

/**
 * Sends a verification code to a WhatsApp number
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} code - The verification code to send
 * @param {Object} context - The Cloudflare Worker context
 * @returns {Promise<Object>} - Response with success/error info
 */
export async function sendVerificationCode(phoneNumber, code, context) {
  const { env } = context;
  
  // Log the attempt but mask the code for security
  console.log(`[WhatsApp] Sending verification code to ${phoneNumber}`);
  
  try {
    // Validate provider configuration
    const provider = env.WHATSAPP_PROVIDER?.toLowerCase() || '';
    
    if (!provider || provider === 'none') {
      console.error('[WhatsApp] No provider configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }
    
    // Prepare the message text
    const appName = env.APP_NAME || 'FoodBao';
    const message = `${appName}: Your verification code is ${code}. This code will expire in 15 minutes. Do not share this code with anyone.`;
    
    // Choose the appropriate provider implementation
    switch (provider) {
      case 'twilio':
        return await sendVerificationViaTwilio(phoneNumber, message, code, context);
      
      case 'messagebird':
        return await sendViaMessageBird(phoneNumber, message, code, context);
        
      case 'meta':
      case 'facebook':
        return await sendViaMetaAPI(phoneNumber, message, code, context);
        
      case 'demo':
      case 'debug':
        // Demo mode - just log the code and pretend it worked
        console.log(`[WhatsApp DEMO] Would send code ${code} to ${phoneNumber}`);
        console.log(`[WhatsApp DEMO] Message: ${message}`);
        return { success: true, provider: 'demo', message: 'Demo mode - code logged but not sent' };
      
      default:
        console.error(`[WhatsApp] Unknown provider: ${provider}`);
        return { success: false, error: `Unknown WhatsApp provider: ${provider}` };
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending verification code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a verification code via Twilio
 * @private
 */
async function sendVerificationViaTwilio(phoneNumber, message, code, context) {
  const { env } = context;
  
  // Check for required Twilio credentials
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
    console.error('[WhatsApp] Missing Twilio credentials');
    return { success: false, error: 'Twilio credentials not configured' };
  }
  
  try {
    // Format the from number correctly for Twilio WhatsApp
    const fromNumber = env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:') 
      ? env.TWILIO_WHATSAPP_FROM 
      : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;
    
    // Format the to number correctly for Twilio WhatsApp
    const toNumber = phoneNumber.startsWith('whatsapp:')
      ? phoneNumber
      : `whatsapp:${phoneNumber}`;
    
    // Prepare the request to Twilio API
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', toNumber);
    formData.append('Body', message);
    
    // Build the authorization header
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    
    // Make the request to Twilio
    const response = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WhatsApp] Twilio API error:', errorData);
      return { success: false, error: errorData.message || 'Twilio API error' };
    }
    
    const responseData = await response.json();
    return { 
      success: true, 
      provider: 'twilio',
      messageId: responseData.sid,
      status: responseData.status
    };
  } catch (error) {
    console.error('[WhatsApp] Twilio error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a verification code via MessageBird
 * @private
 */
async function sendViaMessageBird(phoneNumber, message, code, context) {
  const { env } = context;
  
  // Check for required MessageBird credentials
  if (!env.MESSAGEBIRD_API_KEY || !env.MESSAGEBIRD_WHATSAPP_CHANNEL_ID) {
    console.error('[WhatsApp] Missing MessageBird credentials');
    return { success: false, error: 'MessageBird credentials not configured' };
  }
  
  try {
    // MessageBird API endpoint
    const endpoint = 'https://conversations.messagebird.com/v1/send';
    
    // Prepare the request body
    const requestBody = {
      to: phoneNumber,
      from: env.MESSAGEBIRD_WHATSAPP_CHANNEL_ID,
      type: 'text',
      content: {
        text: message
      }
    };
    
    // Make the request to MessageBird
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${env.MESSAGEBIRD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WhatsApp] MessageBird API error:', errorData);
      return { success: false, error: errorData.errors?.[0]?.description || 'MessageBird API error' };
    }
    
    const responseData = await response.json();
    return { 
      success: true, 
      provider: 'messagebird',
      messageId: responseData.id,
      status: 'sent'
    };
  } catch (error) {
    console.error('[WhatsApp] MessageBird error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a verification code via Meta WhatsApp Business API
 * @private
 */
async function sendViaMetaAPI(phoneNumber, message, code, context) {
  const { env } = context;
  
  // Check for required Meta credentials
  if (!env.META_WHATSAPP_TOKEN || !env.META_WHATSAPP_PHONE_NUMBER_ID) {
    console.error('[WhatsApp] Missing Meta WhatsApp Business API credentials');
    return { success: false, error: 'Meta WhatsApp credentials not configured' };
  }
  
  try {
    // Meta WhatsApp API endpoint
    const endpoint = `https://graph.facebook.com/v17.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    // Clean the phone number to ensure it's in the right format
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Prepare the request body
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        body: message
      }
    };
    
    // Make the request to Meta API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WhatsApp] Meta API error:', errorData);
      return { success: false, error: errorData.error?.message || 'Meta WhatsApp API error' };
    }
    
    const responseData = await response.json();
    return { 
      success: true, 
      provider: 'meta',
      messageId: responseData.messages?.[0]?.id,
      status: 'sent'
    };
  } catch (error) {
    console.error('[WhatsApp] Meta WhatsApp API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a random numeric code of specified length
 * @param {number} length - The length of the code
 * @returns {string} - Random numeric code
 */
export function generateRandomCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Store a verification code in the database
 * @param {string} userId - The user ID
 * @param {string} code - The verification code
 * @param {Object} context - The Cloudflare Worker context
 * @param {number} expiryMinutes - Minutes until the code expires
 * @returns {Promise<Object>} - Response with success/error info
 */
export async function storeVerificationCode(userId, code, context, expiryMinutes = 15) {
  try {
    const supabase = getSupabase(context);
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Delete any existing codes for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);
    
    // Insert the new code
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        reset_code: code,
        expires_at: expiresAt.toISOString()
      });
    
    if (error) {
      throw new Error(`Failed to store verification code: ${error.message}`);
    }
    
    return {
      success: true,
      expiresAt: expiresAt.toISOString()
    };
    
  } catch (error) {
    whatsappLogger('Error storing verification code', {
      error: error.message,
      userId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify a code against stored codes for a user
 * @param {string} userId - User ID
 * @param {string} code - The verification code to check
 * @param {object} context - Cloudflare Worker context
 * @returns {Promise<object>} - Result of verification
 */
export async function verifyCode(userId, code, context) {
  try {
    const supabase = getSupabase(context);
    const now = new Date().toISOString();
    
    // Look for a valid, non-expired code
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('is_valid', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error verifying code:', error);
      return { success: false, valid: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { success: true, valid: false, reason: 'invalid_or_expired' };
    }
    
    // Mark the code as used
    await supabase
      .from('verification_codes')
      .update({ is_valid: false, used_at: now })
      .eq('id', data[0].id);
    
    return { success: true, valid: true, codeData: data[0] };
  } catch (error) {
    console.error('Exception verifying code:', error);
    return { success: false, valid: false, error: error.message };
  }
}