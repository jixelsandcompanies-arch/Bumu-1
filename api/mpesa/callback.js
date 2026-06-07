import { sendPaymentConfirmedSms } from '../_lib/africastalking.js';
import { isCallbackAuthorized } from '../_lib/callbackAuth.js';
import { completePaymentRequest, failPaymentRequest } from '../_lib/database.js';
import { parseDarajaStkCallback } from '../_lib/daraja.js';
import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';

function mpesaDateToIso(value) {
  const text = String(value || '');
  if (!/^\d{14}$/.test(text)) return new Date().toISOString();
  const year = text.slice(0, 4);
  const month = text.slice(4, 6);
  const day = text.slice(6, 8);
  const hour = text.slice(8, 10);
  const minute = text.slice(10, 12);
  const second = text.slice(12, 14);
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`).toISOString();
}

async function findPaymentRequest(callback) {
  const references = [
    callback.checkoutRequestId,
    callback.merchantRequestId,
    callback.transactionId,
    callback.receipt
  ].filter(Boolean);

  for (const reference of references) {
    const result = await getSupabase()
      .from('payment_requests')
      .select('*, customers(*)')
      .or(`provider_reference.eq.${reference},backend_reference.eq.${reference}`)
      .maybeSingle();

    if (result.error) throw result.error;
    if (result.data) return result.data;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req)) {
      sendJson(res, 401, { message: 'M-PESA callback is not authorized.' });
      return;
    }

    const body = await readJson(req);
    const callback = parseDarajaStkCallback(body);

    if (!callback?.checkoutRequestId && !callback?.merchantRequestId) {
      sendJson(res, 400, { message: 'Missing Daraja STK callback reference.' });
      return;
    }

    const paymentRequest = await findPaymentRequest(callback);
    if (!paymentRequest) {
      sendJson(res, 404, { message: 'Payment request not found.' });
      return;
    }

    if (callback.success) {
      const result = await completePaymentRequest(paymentRequest, {
        amount: callback.amount || paymentRequest.amount,
        phone: callback.phone || paymentRequest.phone,
        receipt: callback.receipt || callback.transactionId,
        providerReference: callback.checkoutRequestId || callback.merchantRequestId,
        providerTransactionId: callback.receipt || callback.transactionId,
        providerResponse: body,
        paidAt: mpesaDateToIso(callback.raw?.Body?.stkCallback?.CallbackMetadata?.Item?.find((item) => item.Name === 'TransactionDate')?.Value),
        method: 'mpesa_stk_push'
      });

      if (!result.duplicate) {
        await sendPaymentConfirmedSms({
          customer: { ...result.customer, customer_phone: result.customer.customer_phone || callback.phone },
          amount: result.paidAmount,
          receipt: callback.receipt || callback.transactionId,
          balance: result.nextBalance,
          repaymentPct: result.repaymentPct
        }).catch(() => null);
      }
    } else {
      await failPaymentRequest(paymentRequest.id, {
        reason: callback.resultDescription || 'M-PESA payment failed.',
        providerResponse: body
      });
    }

    sendJson(res, 200, { ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
