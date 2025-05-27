// Config API endpoint to expose certain configuration settings to the client
// This avoids having to hardcode settings in the client code

export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    // Only expose specific settings that are needed by the client UI
    // Never expose sensitive credentials or keys
    const clientConfig = {
      // Feature flags
      whatsappResetEnabled: !!env.ENABLE_WHATSAPP_RESET,
      emailResetEnabled: true, // Always enabled
      
      // Environment information (non-sensitive)
      environment: env.ENVIRONMENT || 'production',
      
      // General app settings
      appName: 'FoodBao Admin',
      supportEmail: env.SUPPORT_EMAIL || 'support@foodbao.com',
      
      // Default country code for phone numbers
      defaultCountryCode: env.DEFAULT_COUNTRY_CODE || '+60',
      
      // Currency settings
      currencySymbol: env.CURRENCY_SYMBOL || 'RM',
      currencyCode: env.CURRENCY_CODE || 'RM'
    };
    
    return new Response(
      JSON.stringify(clientConfig),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // Cache for 5 minutes
        }
      }
    );
    
  } catch (error) {
    console.error('Config API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load configuration'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}