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
    const { data, error } = await getSupabaseAuth().auth.signInWithPassword({
      email: body.identifier,
      password: body.password
    });

    if (error || !data?.session || !data?.user) {
      sendJson(res, 401, { message: error?.message || 'Invalid finance credentials.' });
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
