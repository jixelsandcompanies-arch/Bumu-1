import { sendJson, readJson, sendOptions } from '../../_lib/http.js';
import { assertBodySize, assertRateLimit, genericAuthMessage } from '../../_lib/security.js';
import { getSupabaseAuth } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendOptions(res, 'POST,OPTIONS');
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    assertRateLimit(req, { scope: 'admin-login', limit: 8, windowMs: 60_000 });
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email.includes('@') || password.length < 8) {
      sendJson(res, 400, { message: genericAuthMessage() });
      return;
    }

    const { data, error } = await getSupabaseAuth().auth.signInWithPassword({ email, password });

    if (error || !data?.session || !data?.user) {
      sendJson(res, 401, { message: genericAuthMessage() });
      return;
    }

    const role = data.user.app_metadata?.role || data.user.user_metadata?.role;
    if (role !== 'admin') {
      sendJson(res, 403, { message: 'Admin access is required.' });
      return;
    }

    sendJson(res, 200, {
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email,
        role
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
