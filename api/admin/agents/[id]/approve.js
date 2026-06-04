import { sendJson } from '../../../_lib/http.js';
import { assertRateLimit } from '../../../_lib/security.js';
import { getSupabase, requirePortalUser } from '../../../_lib/supabase.js';
import { sendAccountApprovedSms } from '../../../_lib/africastalking.js';

async function audit(user, action, targetTable, targetId, details = {}) {
  await getSupabase().from('admin_audit_logs').insert({
    actor_user_id: user.id,
    actor_email: user.email,
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
    await assertRateLimit(req, { scope: 'admin-agent-approval', limit: 30, windowMs: 60_000 });
    const user = await requirePortalUser(req, ['admin']);
    const id = req.query?.id || req.url.split('/').slice(-2)[0];

    const updated = await getSupabase()
      .from('agents')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (updated.error) throw updated.error;

    if (updated.data.auth_user_id) {
      const currentUser = await getSupabase().auth.admin.getUserById(updated.data.auth_user_id);
      if (!currentUser.error && currentUser.data?.user) {
        await getSupabase().auth.admin.updateUserById(updated.data.auth_user_id, {
          app_metadata: {
            ...currentUser.data.user.app_metadata,
            role: 'agent',
            status: 'active'
          },
          user_metadata: {
            ...currentUser.data.user.user_metadata,
            role: 'agent',
            status: 'active'
          }
        });
      }
    }

    const smsResult = await sendAccountApprovedSms({
      phone: updated.data.phone,
      name: updated.data.full_name || updated.data.agent_name,
      portal: 'agent'
    }).catch((error) => ({ delivered: false, error: error.message, provider: 'africastalking' }));

    await audit(user, 'agent_approved', 'agents', id, { email: updated.data.email, smsResult });
    sendJson(res, 200, { agent: updated.data, smsResult });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
