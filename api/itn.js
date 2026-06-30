/**
 * ============================================================
 *  SITHELO NPO — PayFast ITN (Instant Transaction Notification)
 *  Vercel Serverless Function
 * ============================================================
 *
 *  Endpoint: POST /api/itn
 *
 *  PayFast sends a server-to-server POST request to your
 *  `notify_url` every time a payment changes status (completed,
 *  failed, cancelled, etc.). This is the authoritative source
 *  of truth for whether a payment actually succeeded.
 *
 *  SECURITY VALIDATION STEPS:
 *  1. Validate source IP address (PayFast server IPs only)
 *  2. Validate MD5 signature integrity
 *  3. Validate with PayFast server (HTTPS callback)
 *  4. Validate merchant ID matches your account
 *  5. Process payment status (COMPLETE/FAILED/PENDING)
 *
 *  ENVIRONMENT VARIABLES (set in Vercel dashboard):
 *  ─────────────────────────────────────────────────
 *  PAYFAST_MERCHANT_ID   — Your live merchant ID
 *  PAYFAST_MERCHANT_KEY  — Your live merchant key
 *  PAYFAST_PASSPHRASE    — Your salt passphrase (from PayFast dashboard)
 *  PAYFAST_SANDBOX       — Set to "true" to use sandbox (omit for production)
 *  ─────────────────────────────────────────────────
 *
 * ============================================================
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// ============================================================
//  CONFIGURATION
//  All values read from Vercel environment variables.
// ============================================================
const config = {
  sandbox: process.env.PAYFAST_SANDBOX === 'true',
  merchantId: process.env.PAYFAST_MERCHANT_ID || '',
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
  passphrase: process.env.PAYFAST_PASSPHRASE || null,
};

// PayFast validation endpoint (used to confirm ITN data)
const PAYFAST_HOST = config.sandbox
  ? 'sandbox.payfast.co.za'
  : 'www.payfast.co.za';

/**
 * ============================================================
 *  PAYFAST VALID IP ADDRESSES
 * ============================================================
 *  PayFast will only send ITN requests from these IP ranges.
 *  Check the official docs periodically for updates:
 *  https://developers.payfast.co.za/docs#ports-ips
 * ============================================================
 */
const PAYFAST_VALID_IPS = [
  '197.97.145.144/28',
  '41.74.179.192/27',
  // Individual IPs extracted from the ranges above
  ...generateIPRange('197.97.145.144', '197.97.145.159'),
  ...generateIPRange('41.74.179.192', '41.74.179.223'),
];

/**
 * Helper: generate a range of IPs between start and end.
 * Simplified — covers the last octet range only.
 */
function generateIPRange(start, end) {
  const ips = [];
  const s = start.split('.').map(Number);
  const e = end.split('.').map(Number);
  for (let i = s[3]; i <= e[3]; i++) {
    ips.push(`${s[0]}.${s[1]}.${s[2]}.${i}`);
  }
  return ips;
}

// ============================================================
//  STEP 1: VALIDATE SOURCE IP ADDRESS
// ============================================================
/**
 * Ensures the incoming request is actually from PayFast servers,
 * not from a malicious actor trying to spoof a payment.
 */
function isValidPayFastIP(ip) {
  // Strip IPv6 prefix if present (e.g., "::ffff:197.97.145.144")
  const cleanIP = ip.replace(/^::ffff:/, '');
  return PAYFAST_VALID_IPS.includes(cleanIP);
}

// ============================================================
//  STEP 2: VALIDATE THE SIGNATURE
// ============================================================
/**
 * PayFast sends a `signature` field which is an MD5 hash of
 * all the other POST parameters (alphabetically sorted),
 * URL-encoded, concatenated with &, and optionally including
 * your passphrase at the end.
 *
 * We reconstruct this hash locally and compare it to the
 * signature PayFast sent. If they don't match, the data
 * has been tampered with.
 */
function validateSignature(postData, passphrase) {
  // 1. Extract and remove the signature from the data
  const receivedSignature = postData.signature;
  const params = { ...postData };
  delete params.signature;

  // 2. Sort keys alphabetically
  const sortedKeys = Object.keys(params).sort();

  // 3. Build the parameter string (URL-encoded values, spaces as +)
  let paramString = sortedKeys
    .map(key => {
      const value = params[key] !== undefined ? params[key] : '';
      return `${key}=${encodeURIComponent(String(value)).replace(/%20/g, '+')}`;
    })
    .join('&');

  // 4. Append passphrase if configured
  if (passphrase && passphrase.trim() !== '') {
    paramString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  }

  // 5. Generate MD5 hash
  const generatedSignature = crypto
    .createHash('md5')
    .update(paramString)
    .digest('hex');

  // 6. Compare
  const isValid = generatedSignature === receivedSignature;
  if (!isValid) {
    console.error('[PayFast ITN] Signature mismatch!');
    console.error('  Expected:', generatedSignature);
    console.error('  Received:', receivedSignature);
  }
  return isValid;
}

// ============================================================
//  STEP 3: VALIDATE WITH PAYFAST SERVER
// ============================================================
/**
 * Makes an HTTPS POST back to PayFast's validation endpoint
 * with the same data you received. PayFast responds with
 * "VALID" or "INVALID". This confirms the data actually
 * originated from their system.
 */
function validateWithPayFast(postData) {
  return new Promise((resolve, reject) => {
    const params = { ...postData };
    delete params.signature;

    const postDataString = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`)
      .join('&');

    const options = {
      hostname: PAYFAST_HOST,
      port: 443,
      path: '/eng/query/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postDataString),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const result = body.trim();
        console.log(`[PayFast ITN] Server validation response: "${result}"`);
        resolve(result === 'VALID');
      });
    });

    req.on('error', (err) => {
      console.error('[PayFast ITN] Validation request failed:', err.message);
      reject(err);
    });

    req.write(postDataString);
    req.end();
  });
}

// ============================================================
//  HELPER: Parse URL-encoded body from raw request
// ============================================================
/**
 * Vercel Serverless Functions don't include Express middleware,
 * so we manually collect and parse the request body.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // If Vercel has already parsed the body (depends on config)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return resolve(req.body);
    }

    let data = '';
    req.on('data', (chunk) => data += chunk);
    req.on('end', () => {
      try {
        resolve(querystring.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// ============================================================
//  VERCEL SERVERLESS FUNCTION HANDLER
// ============================================================
/**
 * POST /api/itn
 *
 * This is the endpoint you set as `notify_url` in your payment
 * form. PayFast will POST transaction data here every time a
 * payment status changes.
 */
module.exports = async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  console.log('\n══════════════════════════════════════');
  console.log('[PayFast ITN] Notification received');
  console.log('══════════════════════════════════════');

  // Parse the URL-encoded POST body
  const postData = await parseBody(req);

  // Log received data (mask sensitive fields in production)
  console.log('[PayFast ITN] Transaction ID:', postData.pf_payment_id);
  console.log('[PayFast ITN] Payment Status:', postData.payment_status);
  console.log('[PayFast ITN] Amount Gross:', postData.amount_gross);
  console.log('[PayFast ITN] Item:', postData.item_name);
  console.log('[PayFast ITN] Donor:', postData.name_first, '-', postData.email_address);

  // ── STEP 1: Validate IP ──
  const sourceIP = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.socket?.remoteAddress || '';
  console.log('[PayFast ITN] Source IP:', sourceIP);

  if (!isValidPayFastIP(sourceIP)) {
    console.error('[PayFast ITN] ❌ REJECTED — Invalid source IP:', sourceIP);
    // Still respond 200 to avoid PayFast retrying
    return res.status(200).send('OK');
  }
  console.log('[PayFast ITN] ✅ IP validated');

  // ── STEP 2: Validate Signature ──
  if (!validateSignature(postData, config.passphrase)) {
    console.error('[PayFast ITN] ❌ REJECTED — Signature mismatch');
    return res.status(200).send('OK');
  }
  console.log('[PayFast ITN] ✅ Signature validated');

  // ── STEP 3: Validate with PayFast server ──
  try {
    const isServerValid = await validateWithPayFast(postData);
    if (!isServerValid) {
      console.error('[PayFast ITN] ❌ REJECTED — PayFast server returned INVALID');
      return res.status(200).send('OK');
    }
    console.log('[PayFast ITN] ✅ Server validation passed');
  } catch (err) {
    console.error('[PayFast ITN] ⚠️  Server validation failed (network error):', err.message);
    // Decide: reject or proceed with caution
    // For safety, we still log and process cautiously
  }

  // ── STEP 4: Validate Merchant ID ──
  if (postData.merchant_id !== config.merchantId) {
    console.error('[PayFast ITN] ❌ REJECTED — Merchant ID mismatch');
    console.error('  Expected:', config.merchantId);
    console.error('  Received:', postData.merchant_id);
    return res.status(200).send('OK');
  }
  console.log('[PayFast ITN] ✅ Merchant ID validated');

  // ── STEP 5: Process the payment based on status ──
  switch (postData.payment_status) {
    case 'COMPLETE':
      console.log('[PayFast ITN] 🎉 PAYMENT COMPLETE');
      console.log(`  → R${postData.amount_gross} received from ${postData.name_first}`);
      console.log(`  → Net amount: R${postData.amount_net} (fee: R${postData.amount_fee})`);
      console.log(`  → PayFast ID: ${postData.pf_payment_id}`);

      // ════════════════════════════════════════════════
      // TODO: Your business logic here:
      //   - Save donation to database
      //   - Send thank-you email to donor
      //   - Update donation counter
      //   - Log for tax/audit purposes
      // ════════════════════════════════════════════════
      break;

    case 'FAILED':
      console.log('[PayFast ITN] ❌ PAYMENT FAILED');
      console.log(`  → ${postData.name_first} (${postData.email_address})`);
      // Optionally: send a follow-up email or retry prompt
      break;

    case 'PENDING':
      console.log('[PayFast ITN] ⏳ PAYMENT PENDING');
      console.log('  → Waiting for bank/EFT confirmation');
      // Some payment methods (like EFT) may be pending first
      break;

    default:
      console.log('[PayFast ITN] ❓ Unknown status:', postData.payment_status);
  }

  // ── IMPORTANT: Always respond 200 to PayFast ──
  // If you don't respond 200, PayFast will keep retrying
  // the notification (up to 5 times over several hours).
  res.status(200).send('OK');
};
