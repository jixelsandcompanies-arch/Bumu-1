import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';
import { sendPaymentConfirmedSms } from '../_lib/africastalking.js';
import { completePaymentRequest, failPaymentRequest } from '../_lib/database.js';
import { isCallbackAuthorized } from '../_lib/callbackAuth.js';

function metadataValue(items, name) {
  return items.find((item) => item.Name === name)?.Value ?? null;
}

function parseMpesaDate(value) {
  const raw = String(value || '');
  if (/^\d{14}$/.test(raw)) {
    const year = raw.slice(0, 4);
    const month = raw.slice(4, 6);
    const day = raw.slice(6, 8);
    const hour = raw.slice(8, 10);
    const minute = raw.slice(10, 12);
    const second = raw.slice(12, 14);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
  }
  return new Date().toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req)) {
      sendJson(res, 401, { message: 'M-Pesa callback is not authorized.' });
      return;
    }

    const body = await readJson(req);
    const callback = body?.Body?.stkCallback || body?.stkCallback || {};
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = Number(callback.ResultCode);
    const resultDescription = callback.ResultDesc || '';
    const metadata = callback.CallbackMetadata?.Item || [];

    if (!checkoutRequestId) {
      sendJson(res, 400, { message: 'Missing CheckoutRequestID.' });
      return;
    }

    const requestResult = await getSupabase()
      .from('payment_requests')
      .select('*, customers(*)')
      .eq('provider_reference', checkoutRequestId)
      .maybeSingle();

    if (requestResult.error) throw requestResult.error;
    if (!requestResult.data) {
      sendJson(res, 404, { message: 'Payment request not found.' });
      return;
    }

    const paymentRequest = requestResult.data;
    const paid = resultCode === 0;
    const amount = Number(metadataValue(metadata, 'Amount') || paymentRequest.amount || 0);
    const receipt = metadataValue(metadata, 'MpesaReceiptNumber');
    const phone = metadataValue(metadata, 'PhoneNumber') || paymentRequest.phone;
    const paidAtRaw = metadataValue(metadata, 'TransactionDate');
    const paidAt = parseMpesaDate(paidAtRaw);

    if (paid) {
      const result = await completePaymentRequest(paymentRequest, {
        amount,
        phone,
        receipt: receipt || checkoutRequestId,
        providerReference: checkoutRequestId,
        providerTransactionId: receipt,
        providerResponse: body,
        paidAt,
        method: 'mpesa_daraja'
      });

      await sendPaymentConfirmedSms({
        customer: { ...result.customer, customer_phone: result.customer.customer_phone || phone },
        amount: result.paidAmount,
        receipt: receipt || checkoutRequestId,
        balance: result.nextBalance,
        repaymentPct: result.repaymentPct
      }).catch(() => null);
    } else {
      await failPaymentRequest(paymentRequest.id, {
        reason: resultDescription || 'Payment failed.',
        providerResponse: body
      });
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
