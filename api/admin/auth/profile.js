import { readJson, sendJson, sendOptions } from '../../_lib/http.js';
import { getSupabase, hasActiveAdminProfile, portalRole, requirePortalUser } from '../../_lib/supabase.js';

function adminProfileFromUser(user, role = 'admin') {
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || user.email,
    name: user.user_metadata?.full_name || user.email,
    phone: user.user_metadata?.phone || '',
    photoUrl: user.user_metadata?.photo_url || '',
    role
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendOptions(res, 'GET,PATCH,OPTIONS');
    return;
  }

  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET,PATCH');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requirePortalUser(req, ['admin']);
    const role = portalRole(user);
    const normalizedRole = role === 'admin' || await hasActiveAdminProfile(user) ? 'admin' : role;

    if (req.method === 'GET') {
      sendJson(res, 200, { user: adminProfileFromUser(user, normalizedRole) });
      return;
    }

    const body = await readJson(req);
    const fullName = String(body.name || body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const photoUrl = String(body.photoUrl || '').trim();

    if (!fullName) {
      sendJson(res, 400, { message: 'Enter the admin name before saving.' });
      return;
    }

    const currentMetadata = user.user_metadata || {};
    const { data, error } = await getSupabase().auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMetadata,
        full_name: fullName,
        phone,
        photo_url: photoUrl
      }
    });

    if (error) {
      sendJson(res, 400, { message: error.message || 'Could not update admin profile.' });
      return;
    }

    const adminProfilePatch = {
      full_name: fullName
    };
    if (phone) adminProfilePatch.phone = phone;

    const adminProfileUpdate = await getSupabase()
      .from('admin_profiles')
      .update(adminProfilePatch)
      .eq('auth_user_id', user.id);

    if (adminProfileUpdate.error) {
      sendJson(res, 400, { message: adminProfileUpdate.error.message || 'Could not update admin profile record.' });
      return;
    }

    sendJson(res, 200, { user: adminProfileFromUser(data.user, normalizedRole) });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
