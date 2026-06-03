import { readJson, sendJson } from '../_lib/http.js';
import { assertBodySize, assertRateLimit, validateStrongPassword } from '../_lib/security.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    assertRateLimit(req, { scope: 'finance-register', limit: 5, windowMs: 60_000 });
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();

    if (!fullName || !email || !validateStrongPassword(password)) {
      sendJson(res, 400, { message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.' });
      return;
    }

    const { data, error } = await getSupabase().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: phone || undefined,
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'finance'
      },
      app_metadata: {
        role: 'finance'
      }
    });

    if (error) {
      sendJson(res, 400, { message: error.message || 'Could not create finance account.' });
      return;
    }

    sendJson(res, 201, {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
        role: 'finance'
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
