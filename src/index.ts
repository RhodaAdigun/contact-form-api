// Cloudflare Worker for DES ALLY website's Contact Form API
// This handles POST requests to submit contact form data and sends emails via Mailtrap


addEventListener('fetch', event =>
{
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request)
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
      return createErrorResponse(validation.message, 400);
    }

    // Send email
    const emailResult = await sendEmail(body);
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

function validateInput(data)
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

async function sendEmail(contactData)
{
  try {
    // Get environment variables
    const apiToken = env.MAILTRAP_API_TOKEN as string;
    const fromEmail = env.FROM_EMAIL as string;
    const toEmail = env.TO_EMAIL as string;
    const mailtrapApiUrl = env.MAILTRAP_API_URL as string;

    // Temporary logging to verify variables exist
    console.log('API Token exists:', !!apiToken);
    console.log('From Email:', fromEmail);
    console.log('To Email:', toEmail);
    //

    if (!apiToken || !fromEmail || !toEmail) {
      console.error('Missing required environment variables');
      return { success: false };
    }

    // Prepare email content
    const subject = `Contact Form: ${contactData.subject || 'New Inquiry'}`;
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${contactData.name}</p>
      <p><strong>Email:</strong> ${contactData.email}</p>
      ${contactData.mobile ? `<p><strong>Mobile:</strong> ${contactData.mobile}</p>` : ''}
      <p><strong>Subject:</strong> ${contactData.subject || 'No subject provided'}</p>
      <h3>Message:</h3>
      <p>${contactData.message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><em>This message was sent via the contact form on desallyltd.com</em></p>
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

function createErrorResponse(message, status = 400)
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
