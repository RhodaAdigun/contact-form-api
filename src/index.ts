// Cloudflare Worker for DES ALLY website's Contact Form API
// This handles POST requests to submit contact form data and sends emails via Mailtrap

export default {
  async fetch(request: any, env: any, ctx: any): Promise<any>
  {
    return handleRequest(request, env);
  }
};

interface Env
{
  MAILTRAP_API_TOKEN: string;
  FROM_EMAIL: string;
  TO_EMAIL: string;
  MAILTRAP_API_URL: string;
}

interface ContactData
{
  name: string;
  email: string;
  mobile?: string;
  subject?: string;
  message: string;
}

async function handleRequest(request: Request, env: Env)
{
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  // Only allow POST requests to /contact
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  const url = new URL(request.url);
  if (url.pathname !== '/contact') {
    return createErrorResponse('Endpoint not found', 404);
  }

  try {
    // Parse JSON body
    const body = await request.json();

    // Validate input
    const validation = validateInput(body);
    if (!validation.isValid) {
      return createErrorResponse(validation.message || 'Validation failed', 400);
    }

    // Send email
    const emailResult = await sendEmail(body, env);
    if (!emailResult.success) {
      return createErrorResponse('Unable to send your inquiry. Please try again later.', 500);
    }

    // Return success response
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Your inquiry has been sent.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return createErrorResponse('Unable to send your inquiry. Please try again later.', 500);
  }
}

interface ValidationResult
{
  isValid: boolean;
  message?: string;
}

function validateInput(data: any): ValidationResult
{
  // Check if data exists
  if (!data || typeof data !== 'object') {
    return { isValid: false, message: 'Invalid request body' };
  }

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { isValid: false, message: 'Name is required' };
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    return { isValid: false, message: 'Email is required' };
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { isValid: false, message: 'Message is required' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    return { isValid: false, message: 'Please provide a valid email address' };
  }

  // Validate mobile number if provided
  if (data.mobile !== undefined && data.mobile !== null && data.mobile !== '') {
    // Check if mobile is a valid number (integer or string of digits)
    const mobileStr = String(data.mobile).trim();
    if (!/^\d+$/.test(mobileStr) || mobileStr.length < 7 || mobileStr.length > 15) {
      return { isValid: false, message: 'Mobile number must be valid' };
    }
  }

  // Validate field lengths
  if (data.name.trim().length > 100) {
    return { isValid: false, message: 'Name must be less than 100 characters' };
  }

  if (data.subject && data.subject.length > 200) {
    return { isValid: false, message: 'Subject must be less than 200 characters' };
  }

  if (data.message.trim().length > 1000) {
    return { isValid: false, message: 'Message must be less than 1000 characters' };
  }

  return { isValid: true };
}

async function sendEmail(contactData: ContactData, env: Env)
{
  try {
    // Get environment variables
    const apiToken = env.MAILTRAP_API_TOKEN;
    const fromEmail = env.FROM_EMAIL;
    const toEmail = env.TO_EMAIL;
    const mailtrapApiUrl = env.MAILTRAP_API_URL;



    if (!apiToken || !fromEmail || !toEmail) {
      console.error('Missing required environment variables');
      return { success: false };
    }

    // Prepare email content
    const subject = `Contact Form: ${contactData.subject || 'New Inquiry'}`;

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) =>
    {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safeName = escapeHtml(contactData.name);
    const safeEmail = escapeHtml(contactData.email);
    const safeMobile = contactData.mobile ? escapeHtml(contactData.mobile) : '';
    const safeSubject = contactData.subject ? escapeHtml(contactData.subject) : 'No subject provided';
    // Escape HTML in message and convert newlines to <br>
    const safeMessage = escapeHtml(contactData.message).replace(/\n/g, '<br>');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #1a1a1a; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">New Contact Form Submission</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Contact Information Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 120px; padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Name</span>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 15px; color: #1a1a1a; font-weight: 500;">${safeName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="width: 120px; padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <a href="mailto:${safeEmail}" style="font-size: 15px; color: #2563eb; text-decoration: none; font-weight: 500;">${safeEmail}</a>
                        </td>
                      </tr>
                      ${safeMobile ? `
                      <tr>
                        <td style="width: 120px; padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Mobile</span>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <a href="tel:${safeMobile}" style="font-size: 15px; color: #2563eb; text-decoration: none; font-weight: 500;">${safeMobile}</a>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="width: 120px; padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Subject</span>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 15px; color: #1a1a1a; font-weight: 500;">${safeSubject}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 24px 0;">
                    <div style="height: 1px; background-color: #e5e5e5;"></div>
                  </td>
                </tr>
              </table>

              <!-- Message Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Message</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 6px; border-left: 3px solid #2563eb;">
                    <div style="font-size: 15px; color: #1a1a1a; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This message was sent via the contact form on
                <a href="https://desallyltd.com" style="color: #2563eb; text-decoration: none;">desallyltd.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
New Contact Form Submission

Name: ${contactData.name}
Email: ${contactData.email}${contactData.mobile ? `\nMobile: ${contactData.mobile}` : ''}
Subject: ${contactData.subject || 'No subject provided'}

Message:
${contactData.message}

---
This message was sent via the contact form on desallyltd.com
    `;

    // Mailtrap Email Sending API payload
    const emailPayload = {
      from: { email: fromEmail },
      to: [ { email: toEmail } ],
      subject,
      text: textContent,
      html: htmlContent,
      reply_to: { email: contactData.email }
    };

    // Send email via Mailtrap Email API
    const response = await fetch(mailtrapApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('Mailtrap API error:', response.status, errorText);
      return { success: false };
    }

  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false };
  }
}

function createErrorResponse(message: string, status: number = 400)
{
  return new Response(JSON.stringify({
    status: 'error',
    message: message
  }), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders()
    }
  });
}

function handleCORS()
{
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders()
  });
}

function getCORSHeaders()
{
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
