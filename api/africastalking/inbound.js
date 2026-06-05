import { acceptNextOfKinByPhone } from '../_lib/database.js';
import { sendJson } from '../_lib/http.js';

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('application/json')) {
        resolve(JSON.parse(body || '{}'));
        return;
      }
      resolve(Object.fromEntries(new URLSearchParams(body)));
    });
  });
}

function inboundSecretMatches(req, params) {
  const expected = String(process.env.AFRICASTALKING_INBOUND_SECRET || process.env.AFRICAS_TALKING_INBOUND_SECRET || '').trim();
  if (!expected) return true;
  const provided = String(req.headers['x-bumu-webhook-secret'] || params.secret || '').trim();
  return provided === expected;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const params = await readBody(req);
    if (!inboundSecretMatches(req, params)) {
      sendJson(res, 403, { message: 'Unauthorized.' });
      return;
    }

    const text = String(params.text || params.message || params.Body || '').trim().toLowerCase();
    const from = String(params.from || params.msisdn || params.sender || params.From || '').trim();
    const accepts = ['1', 'yes', 'y', 'accept', 'accepted', 'ok'].includes(text);

    if (!accepts) {
      sendJson(res, 200, { message: 'Reply 1 or YES to accept being next-of-kin for this Bumu Paygo application.' });
      return;
    }

    await acceptNextOfKinByPhone(from);
    sendJson(res, 200, { message: 'Thank you. Your next-of-kin acceptance has been confirmed.' });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message || 'Could not confirm acceptance.' });
  }
}
