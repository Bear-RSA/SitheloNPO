/**
 * ============================================================
 *  SITHELO NPO — Newsletter Subscription
 *  Vercel Serverless Function
 * ============================================================
 *
 *  Endpoint: POST /api/newsletter
 *
 *  Receives an email address from the footer newsletter form
 *  and sends a notification email to info@sithelonpo.co.za
 *  using the Resend API.
 *
 *  ENVIRONMENT VARIABLES (set in Vercel dashboard):
 *  ─────────────────────────────────────────────────
 *  RESEND_API_KEY — Your Resend API key
 *  ─────────────────────────────────────────────────
 */

/**
 * Helper function to escape HTML special characters to prevent XSS.
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let email = '';

    // Handle both JSON and URL-encoded payloads just in case
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        email = parsed.email;
      } catch (e) {
        // Fallback or ignore
      }
    } else if (req.body && req.body.email) {
      email = req.body.email;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    // Escape email to prevent HTML injection in the email body
    const safeEmail = escapeHtml(email);

    // If no API key is configured, log it and return a mock success
    // This allows local dev to proceed without errors if the key isn't set yet.
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Newsletter API] RESEND_API_KEY is not set. Mocking success.');
      console.log(`[Newsletter API] New subscriber: ${safeEmail}`);
      return res.status(200).json({ success: true, message: 'Mock subscription successful.' });
    }

    // Prepare Resend payload
    const payload = {
      from: 'Sithelo NPO <onboarding@resend.dev>', // Replace with your verified domain in production
      to: 'newsletter@sithelonpo.co.za',
      cc: 'info@sithelonpo.co.za',
      subject: 'New Newsletter Subscriber!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8EAED; border-radius: 8px; overflow: hidden;">
          <div style="background: #D9166F; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">New Newsletter Subscriber</h2>
          </div>
          <div style="padding: 30px 20px; background: #FAFAFA; text-align: center;">
            <p style="margin-top: 0; font-size: 16px; color: #1A0A12;">You have a new newsletter subscriber.</p>
            <div style="background: white; border: 1px solid #E8EAED; padding: 15px; border-radius: 6px; font-size: 18px; font-weight: bold; color: #D9166F; margin: 20px 0;">
              ${safeEmail}
            </div>
          </div>
          <div style="background: #1A0A12; padding: 15px; text-align: center; color: #B0B8C1; font-size: 12px;">
            SITHELO NPO &ndash; Sivusa Ithemba Lembokodo
          </div>
        </div>
      `
    };

    // Make the request to Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Newsletter API] Resend error:', data);
      return res.status(500).json({ error: 'Failed to send notification email.' });
    }

    console.log(`[Newsletter API] Subscription successful for: ${safeEmail}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Newsletter API] Internal error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
