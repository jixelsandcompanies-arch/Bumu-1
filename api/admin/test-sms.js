import { readJson, sendJson } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { requirePortalUser } from '../_lib/supabase.js';
import { getSmsStatus, sendSms, smsConfigDiagnostics } from '../_lib/africastalking.js';

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
    const waitSeconds = Math.min(Math.max(Number(body.waitSeconds || 0), 0), 10);
    const finalStatus = result.sid && waitSeconds > 0
      ? await delay(waitSeconds * 1000).then(() => getSmsStatus(result.sid))
      : null;

    sendJson(res, 200, { smsConfig: smsConfigDiagnostics(), result, finalStatus });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      message: error.message,
      smsConfig: smsConfigDiagnostics(),
      providerResponse: error.providerResponse || null
    });
  }
}
