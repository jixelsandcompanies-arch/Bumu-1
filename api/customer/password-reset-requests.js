import { requestPasswordResetOtp } from '../_lib/database.js';
import { sendJson, readJson } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    assertRateLimit(req, { scope: 'customer-password-reset', limit: 5, windowMs: 60_000 });
    const body = await readJson(req);
    const result = await requestPasswordResetOtp({ ...body, sourcePortal: 'customer' });
    sendJson(res, 201, result);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
