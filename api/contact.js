import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sanitize user input before injecting into HTML email bodies
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, email, phone, reason, message } = req.body || {};

  // Validate required fields
  if (!first_name || !email || !reason || !message) {
    return res.status(400).json({
      error: 'Missing required fields: first_name, email, reason, and message are required.',
    });
  }

  // Sanitize all user-supplied values
  const safeFirstName = escapeHtml(first_name);
  const safeLastName = escapeHtml(last_name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeReason = escapeHtml(reason);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  try {
    const { data, error } = await resend.emails.send({
      from: 'SITHELO NPO <noreply@sithelonpo.co.za>',
      to: ['info@sithelonpo.co.za'],
      replyTo: email,
      subject: `New Contact: ${safeReason}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeFirstName} ${safeLastName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">${safePhone || 'Not provided'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Reason</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeReason}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Message</td><td style="padding:8px;">${safeMessage}</td></tr>
        </table>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
}
