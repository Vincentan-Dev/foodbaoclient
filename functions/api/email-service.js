// Email service utility for sending emails from serverless functions
// This works with services like SendGrid, Mailgun, etc.

/**
 * Debug logger for email service
 * @param {string} message - Debug message
 * @param {Object} data - Additional data to log
 */
function emailDebugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[EMAIL-DEBUG ${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Sends an email using the configured email service
 * @param {Object} options - Email sending options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content (optional)
 * @param {string} options.from - Sender email address (optional, uses default if not provided)
 * @param {Object} context - Cloudflare Workers context containing env variables
 * @returns {Promise<Object>} - Result of the email send operation
 */
export async function sendEmail(options, context) {
  // Log email attempt
  emailDebugLog('Email send attempt', {
    to: options.to,
    subject: options.subject,
    hasHtml: !!options.html,
    textLength: options.text ? options.text.length : 0
  });

  // Get which email service to use from environment variable
  const emailService = context.env.EMAIL_SERVICE || 'gmail';
  
  emailDebugLog('Using email service', { 
    service: emailService,
    availableVars: {
      has_sendgrid_key: !!context.env.SENDGRID_API_KEY,
      has_mailgun_key: !!context.env.MAILGUN_API_KEY,
      has_mailgun_domain: !!context.env.MAILGUN_DOMAIN,
      has_gmail_user: !!context.env.GMAIL_USER,
      has_gmail_pass: !!context.env.GMAIL_APP_PASSWORD,
      has_email_from: !!context.env.EMAIL_FROM
    }
  });
  
  try {
    let result;
    
    switch (emailService.toLowerCase()) {
      case 'sendgrid':
        result = await sendWithSendGrid(options, context);
        break;
      case 'mailgun':
        result = await sendWithMailgun(options, context);
        break;
      case 'gmail':
        result = await sendWithGmail(options, context);
        break;
      default:
        throw new Error(`Unsupported email service: ${emailService}`);
    }
    
    emailDebugLog('Email sent successfully', { 
      service: emailService,
      result 
    });
    
    return result;
  } catch (error) {
    emailDebugLog('Email sending failed', { 
      error: error.message,
      stack: error.stack,
      service: emailService 
    });
    throw error;
  }
}

/**
 * Sends an email using Gmail SMTP via a third-party API service
 * This implementation uses a free SMTP API service (it's recommended to use your own SMTP server in production)
 */
async function sendWithGmail(options, context) {
  // These should be set in your Cloudflare environment variables
  const gmailUser = context.env.GMAIL_USER;
  const gmailPass = context.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPass) {
    throw new Error('Gmail credentials are not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
  }
  
  // Get from address from environment or use provided value
  const fromEmail = options.from || gmailUser;
  
  try {
    // Using the EmailJS API which provides a simple REST interface to SMTP
    // Note: In production, consider using a dedicated SMTP service
    const apiUrl = 'https://api.emailjs.com/api/v1.0/email/send';
    
    const data = {
      service_id: 'gmail',  // Using the Gmail service
      template_id: 'template_default', // This is a generic template ID
      user_id: 'user_default', // Replace with your EmailJS user ID if you're using the service
      template_params: {
        to_email: options.to,
        from_name: 'FoodBao Admin',
        from_email: fromEmail,
        subject: options.subject,
        message_html: options.html || options.text,
        message_text: options.text
      },
      accessToken: 'your_access_token' // Replace with your token if using EmailJS
    };
    
    // For a direct SMTP approach using a simple API
    // This is an example using a public SMTP API service
    const smtpData = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text,
      html: options.html || '',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      }
    };
    
    // Using a simplified direct approach with fetch
    // Note: Cloudflare Workers may have limitations with direct SMTP
    // so you might need to use a third-party API as a bridge
    const response = await fetch('https://smtpapi.yourdomain.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gmail SMTP error:', errorText);
      throw new Error(`Gmail SMTP API error: ${response.status} ${response.statusText}`);
    }
    
    return { success: true, service: 'gmail' };
  } catch (error) {
    console.error('Error sending email with Gmail SMTP:', error);
    throw error;
  }
}

/**
 * Sends an email using SendGrid
 */
async function sendWithSendGrid(options, context) {
  // SendGrid API key from environment variables
  const apiKey = context.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error('SendGrid API key is not configured');
  }
  
  const url = 'https://api.sendgrid.com/v3/mail/send';
  
  // Get from address from environment or use provided value
  const fromEmail = options.from || context.env.EMAIL_FROM || 'noreply@yourdomain.com';
  
  // Prepare the payload in SendGrid format
  const data = {
    personalizations: [
      {
        to: [{ email: options.to }],
        subject: options.subject,
      },
    ],
    from: { email: fromEmail },
    content: [
      {
        type: 'text/plain',
        value: options.text || '',
      },
    ],
  };
  
  // Add HTML content if provided
  if (options.html) {
    data.content.push({
      type: 'text/html',
      value: options.html,
    });
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`);
    }
    
    return { success: true, service: 'sendgrid' };
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    throw error;
  }
}

/**
 * Sends an email using Mailgun
 */
async function sendWithMailgun(options, context) {
  // Mailgun API key and domain from environment variables
  const apiKey = context.env.MAILGUN_API_KEY;
  const domain = context.env.MAILGUN_DOMAIN;
  
  if (!apiKey || !domain) {
    throw new Error('Mailgun API key or domain is not configured');
  }
  
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
  // Default from address
  const fromEmail = options.from || context.env.EMAIL_FROM || `noreply@${domain}`;
  
  // Prepare form data for Mailgun
  const formData = new FormData();
  formData.append('from', fromEmail);
  formData.append('to', options.to);
  formData.append('subject', options.subject);
  formData.append('text', options.text || '');
  
  if (options.html) {
    formData.append('html', options.html);
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun error:', errorText);
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return { success: true, service: 'mailgun', messageId: result.id };
  } catch (error) {
    console.error('Error sending email with Mailgun:', error);
    throw error;
  }
}

/**
 * Sends a password reset email
 * @param {Object} options - Password reset options
 * @param {string} options.email - User's email address
 * @param {string} options.resetUrl - Password reset URL
 * @param {Object} context - Cloudflare Workers context
 * @returns {Promise<Object>} - Result of the email send operation
 */
export async function sendPasswordResetEmail(options, context) {
  const subject = 'Reset Your Password - FoodBao Admin';
  
  // Plain text version
  const text = `
Hello,

You recently requested to reset your password for your FoodBao Admin account. 
Click the link below to reset it:

${options.resetUrl}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email or contact support if you have questions.

Thanks,
The FoodBao Team
`;

  // HTML version (more visually appealing)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 10px;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header img {
      max-width: 120px;
      height: auto;
    }
    h1 {
      color: #00897b;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background-color: #00897b;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
    .expires {
      font-style: italic;
      color: #777;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <p>Hello,</p>
    <p>You recently requested to reset your password for your FoodBao Admin account. Click the button below to reset it:</p>
    <p style="text-align: center;">
      <a href="${options.resetUrl}" class="button">Reset Password</a>
    </p>
    <p class="expires">This link will expire in 24 hours.</p>
    <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
    <p>Thanks,<br>The FoodBao Team</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} FoodBao. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: options.email,
    subject,
    text,
    html
  }, context);
}