import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJson(req);
    const result = body.Result || body.result || {};
    const conversationId = result.ConversationID;
    const originatorConversationId = result.OriginatorConversationID;
    const resultCode = Number(result.ResultCode);
    const paid = resultCode === 0;

    if (!conversationId && !originatorConversationId) {
      sendJson(res, 400, { message: 'Missing B2C conversation reference.' });
      return;
    }

    let requestQuery = getSupabase()
      .from('agent_payout_requests')
      .select('*');

    if (conversationId) {
      requestQuery = requestQuery.eq('backend_reference', conversationId);
    } else {
      requestQuery = requestQuery.eq('provider_reference', originatorConversationId);
    }

    const requestResult = await requestQuery.maybeSingle();
    if (requestResult.error) throw requestResult.error;
    if (!requestResult.data) {
      sendJson(res, 404, { message: 'Payout request not found.' });
      return;
    }

    const status = paid ? 'paid' : 'failed';
    const completedAt = new Date().toISOString();
    const updatePayout = await getSupabase()
      .from('agent_payout_requests')
      .update({
        status,
        provider_response: body,
        processed_at: completedAt,
        provider_reference: conversationId || originatorConversationId
      })
      .eq('id', requestResult.data.id)
      .select()
      .single();

    if (updatePayout.error) throw updatePayout.error;

    const updateCommission = await getSupabase()
      .from('commissions')
      .update({
        status,
        payout_status: status,
        paid_at: paid ? completedAt : null,
        payout_completed_at: paid ? completedAt : null,
        payout_reference: conversationId || originatorConversationId || requestResult.data.id,
        provider_response: body,
        payout_error: paid ? null : result.ResultDesc || 'B2C payout failed.'
      })
      .eq('id', requestResult.data.commission_id);

    if (updateCommission.error) throw updateCommission.error;

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
