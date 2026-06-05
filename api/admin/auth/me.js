import { sendJson } from '../../_lib/http.js';
import { portalRole, requirePortalUser } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requirePortalUser(req, ['admin']);
    sendJson(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email,
        role: portalRole(user),
        phone: user.user_metadata?.phone || ''
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
