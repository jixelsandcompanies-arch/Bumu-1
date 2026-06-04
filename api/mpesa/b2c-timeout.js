import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';
import { isCallbackAuthorized } from '../_lib/callbackAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req, ['PAYOUT_CALLBACK_SECRET', 'WEBHOOK_SECRET'])) {
      sendJson(res, 401, { message: 'B2C timeout callback is not authorized.' });
      return;
    }

    const body = await readJson(req);
    const conversationId = body.ConversationID || body.OriginatorConversationID || body.Result?.ConversationID;

    if (conversationId) {
      let request = await getSupabase()
        .from('agent_payout_requests')
        .select('*')
        .eq('backend_reference', conversationId)
        .maybeSingle();

      if (!request.error && !request.data) {
        request = await getSupabase()
          .from('agent_payout_requests')
          .select('*')
          .eq('provider_reference', conversationId)
          .maybeSingle();
      }

      if (!request.error && request.data) {
        await getSupabase()
          .from('agent_payout_requests')
          .update({
            status: 'failed',
            provider_response: body,
            processed_at: new Date().toISOString()
          })
          .eq('id', request.data.id);

        await getSupabase()
          .from('commissions')
          .update({
            status: 'failed',
            payout_status: 'failed',
            provider_response: body,
            payout_error: 'Daraja B2C request timed out.'
          })
          .eq('id', request.data.commission_id);
      }
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
