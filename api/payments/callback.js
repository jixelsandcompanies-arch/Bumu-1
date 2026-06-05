import { sendPaymentConfirmedSms } from '../_lib/africastalking.js';
import { completePaymentRequest, failPaymentRequest } from '../_lib/database.js';
import { isCallbackAuthorized } from '../_lib/callbackAuth.js';
import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';

function parseAmount(value) {
  const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req)) {
      sendJson(res, 401, { message: 'Payment callback is not authorized.' });
      return;
    }

    const body = await readJson(req);
    const transactionId = body.transactionId || body.provider_reference || body.id;
    const paid = String(body.status || '').toLowerCase() === 'success';
    const amount = parseAmount(body.value || body.amount);
    const phone = body.phoneNumber || body.phone;

    if (!transactionId) {
      sendJson(res, 400, { message: 'Missing payment transactionId.' });
      return;
    }

    const requestResult = await getSupabase()
      .from('payment_requests')
      .select('*, customers(*)')
      .or(`provider_reference.eq.${transactionId},backend_reference.eq.${transactionId}`)
      .maybeSingle();

    if (requestResult.error) throw requestResult.error;
    if (!requestResult.data) {
      sendJson(res, 404, { message: 'Payment request not found.' });
      return;
    }

    const paymentRequest = requestResult.data;

    if (paid) {
      const result = await completePaymentRequest(paymentRequest, {
        amount,
        phone,
        receipt: transactionId,
        providerReference: transactionId,
        providerTransactionId: transactionId,
        providerResponse: body,
        paidAt: new Date().toISOString(),
        method: 'mpesa'
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

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
