import { readJson, sendJson } from '../../../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../../../_lib/security.js';
import { getSupabase, requirePortalUser } from '../../../_lib/supabase.js';
import { sendScreeningSms } from '../../../_lib/africastalking.js';

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
    assertBodySize(req);
    assertRateLimit(req, { scope: 'admin-application-review', limit: 30, windowMs: 60_000 });
    const user = await requirePortalUser(req, ['admin']);
    const body = await readJson(req);
    const id = req.query?.id || req.url.split('/').slice(-2)[0];
    const action = String(body.action || '').trim();
    const reason = String(body.reason || '').trim();

    if (!['approve', 'reject', 'request_info'].includes(action)) {
      sendJson(res, 400, { message: 'Choose approve, reject, or request information.' });
      return;
    }

    const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'info_required';
    const application = await getSupabase()
      .from('customer_applications')
      .select('*, customers(*)')
      .eq('id', id)
      .single();

    if (application.error) throw application.error;

    const updateApplication = await getSupabase()
      .from('customer_applications')
      .update({
        status: nextStatus,
        review_reason: reason || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateApplication.error) throw updateApplication.error;

    const customerStatus = nextStatus === 'approved' ? 'active' : nextStatus === 'rejected' ? 'rejected' : 'not_registered';
    const updateCustomer = await getSupabase()
      .from('customers')
      .update({
        status: customerStatus,
        application_status: nextStatus === 'approved' ? 'active' : nextStatus,
        screening_reason: reason || null,
        screened_by: user.id,
        screened_at: new Date().toISOString()
      })
      .eq('id', application.data.customer_id)
      .select()
      .single();

    if (updateCustomer.error) throw updateCustomer.error;

    const agentResult = application.data.agent_id
      ? await getSupabase().from('agents').select('*').eq('agent_code', application.data.agent_id).maybeSingle()
      : { data: null };

    const smsAction = action === 'request_info' ? 'info' : action;
    const smsResult = await sendScreeningSms({
      action: smsAction,
      customer: updateCustomer.data,
      agent: agentResult.data,
      reason,
      tempPassword: body.tempPassword
    }).catch((smsError) => ({
      error: smsError.message,
      provider: 'africastalking'
    }));

    await getSupabase().from('agent_notifications').insert({
      agent_name: application.data.agent_name,
      agent_code: application.data.agent_id,
      customer_name: application.data.customers?.customer_name || 'Customer',
      message: `Application ${nextStatus.replace('_', ' ')}${reason ? `: ${reason}` : '.'}`,
      status: 'queued',
      source_portal: 'admin'
    });

    await audit(user, `application_${nextStatus}`, 'customer_applications', id, { reason });
    sendJson(res, 200, { application: updateApplication.data, customer: updateCustomer.data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
