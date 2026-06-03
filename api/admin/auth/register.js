import { readJson, sendJson } from '../../_lib/http.js';
import { assertBodySize, assertRateLimit, validateStrongPassword } from '../../_lib/security.js';
import { getSupabase } from '../../_lib/supabase.js';

async function audit(actorEmail, action, targetTable, targetId, details = {}) {
  await getSupabase().from('admin_audit_logs').insert({
    actor_email: actorEmail,
    action,
    target_table: targetTable,
    target_id: targetId,
    details
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
    assertRateLimit(req, { scope: 'admin-register', limit: 4, windowMs: 60_000 });
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();

    if (!fullName || !email.includes('@') || !validateStrongPassword(password)) {
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
        role: 'admin'
      },
      app_metadata: {
        role: 'admin'
      }
    });

    if (error) {
      sendJson(res, 400, { message: error.message || 'Could not create admin account.' });
      return;
    }

    const profile = await getSupabase()
      .from('admin_profiles')
      .upsert({
        auth_user_id: data.user.id,
        full_name: fullName,
        email,
        phone,
        role: 'admin',
        status: 'active'
      }, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (profile.error) throw profile.error;
    await audit(email, 'admin_registered', 'admin_profiles', profile.data.id, { email });

    sendJson(res, 201, {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
        role: 'admin'
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
