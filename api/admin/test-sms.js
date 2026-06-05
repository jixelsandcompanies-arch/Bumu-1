import { readJson, sendJson } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { requirePortalUser } from '../_lib/supabase.js';
import { sendSms } from '../_lib/twilio.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    await assertRateLimit(req, { scope: 'admin-test-sms', limit: 5, windowMs: 60_000 });
    await requirePortalUser(req, ['admin']);
    const body = await readJson(req);
    const phone = String(body.phone || '').trim();

    if (!phone) {
      sendJson(res, 400, { message: 'Enter a phone number.' });
      return;
    }

    const result = await sendSms({
      to: phone,
      message: `Bumu Paygo test SMS ${new Date().toISOString()}.`
    });

    sendJson(res, 200, { result });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      message: error.message,
      providerResponse: error.providerResponse || null
    });
  }
}
