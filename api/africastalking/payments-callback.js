import { sendPaymentConfirmedSms, sendCommissionPaidSms } from '../_lib/africastalking.js';
import { completePaymentRequest, failPaymentRequest } from '../_lib/database.js';
import { isCallbackAuthorized } from '../_lib/callbackAuth.js';
import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';

function parseAmount(value) {
  const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function isSuccess(value) {
  return ['success', 'successful', 'completed', 'paid'].includes(String(value || '').toLowerCase());
}

async function handlePaymentRequest(body, transactionId) {
  const requestResult = await getSupabase()
    .from('payment_requests')
    .select('*, customers(*)')
    .or(`provider_reference.eq.${transactionId},backend_reference.eq.${transactionId}`)
    .maybeSingle();

  if (requestResult.error) throw requestResult.error;
  if (!requestResult.data) return false;

  const paymentRequest = requestResult.data;
  const paid = isSuccess(body.status);
  const amount = parseAmount(body.value || body.amount || paymentRequest.amount);
  const phone = body.phoneNumber || body.phone || paymentRequest.phone;

  if (paid) {
    const result = await completePaymentRequest(paymentRequest, {
      amount,
      phone,
      receipt: transactionId,
      providerReference: transactionId,
      providerTransactionId: transactionId,
      providerResponse: body,
      paidAt: new Date().toISOString(),
      method: 'africastalking_mobile_checkout'
    });

    await sendPaymentConfirmedSms({
      customer: { ...result.customer, customer_phone: result.customer.customer_phone || phone },
      amount: result.paidAmount,
      receipt: transactionId,
      balance: result.nextBalance,
      repaymentPct: result.repaymentPct
    }).catch(() => null);
  } else {
    await failPaymentRequest(paymentRequest.id, {
      reason: body.description || body.message || 'Payment failed.',
      providerResponse: body
    });
  }

  return true;
}

async function handlePayoutRequest(body, transactionId) {
  const requestResult = await getSupabase()
    .from('agent_payout_requests')
    .select('*')
    .or(`provider_reference.eq.${transactionId},backend_reference.eq.${transactionId}`)
    .maybeSingle();

  if (requestResult.error) throw requestResult.error;
  if (!requestResult.data) return false;

  const paid = isSuccess(body.status);
  const status = paid ? 'paid' : 'failed';
  const completedAt = new Date().toISOString();
  const updatePayout = await getSupabase()
    .from('agent_payout_requests')
    .update({
      status,
      provider_response: body,
      processed_at: completedAt,
      provider_reference: transactionId,
      backend_reference: transactionId
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
      payout_reference: transactionId,
      provider_response: body,
      payout_error: paid ? null : body.description || body.message || 'B2C payout failed.'
    })
    .eq('id', requestResult.data.commission_id)
    .select()
    .single();

  if (updateCommission.error) throw updateCommission.error;
  if (paid) await sendCommissionPaidSms({ commission: updateCommission.data }).catch(() => null);

  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req)) {
      sendJson(res, 401, { message: 'Africa\'s Talking payment callback is not authorized.' });
      return;
    }

    const body = await readJson(req);
    const transactionId = body.transactionId || body.providerRefId || body.providerReference || body.id;
    if (!transactionId) {
      sendJson(res, 400, { message: 'Missing transactionId.' });
      return;
    }

    const handledPayment = await handlePaymentRequest(body, transactionId);
    const handledPayout = handledPayment ? false : await handlePayoutRequest(body, transactionId);

    if (!handledPayment && !handledPayout) {
      sendJson(res, 404, { message: 'Matching payment or payout request was not found.' });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
