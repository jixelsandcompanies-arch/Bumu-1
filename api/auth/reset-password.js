import { readJson, sendJson } from '../_lib/http.js';
import { resetPasswordWithSupabaseOtp } from '../_lib/supabase-password-reset.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    await assertRateLimit(req, { scope: 'auth-reset-password', limit: 5, windowMs: 60_000 });
    const body = await readJson(req);

    if (process.env.BACKEND_API_URL) {
      const response = await fetch(`${process.env.BACKEND_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      sendJson(res, response.status, data);
      return;
    }

    sendJson(res, 200, await resetPasswordWithSupabaseOtp(body));
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
