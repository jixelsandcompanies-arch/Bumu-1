import { sendJson, readJson } from '../_lib/http.js';
import { getSupabaseAuth } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJson(req);
    const email = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email.includes('@') || password.length < 8) {
      sendJson(res, 400, { message: 'Enter the email and password used during registration.' });
      return;
    }

    const { data, error } = await getSupabaseAuth().auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.session || !data?.user) {
      sendJson(res, 401, { message: 'Invalid login credentials. Check the registered email and password.' });
      return;
    }

    const role = data.user.app_metadata?.role || data.user.user_metadata?.role;

    if (role !== 'finance' && role !== 'admin') {
      sendJson(res, 403, { message: 'Finance access is required.' });
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
