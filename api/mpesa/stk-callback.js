import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';
import { sendPaymentConfirmedSms } from '../_lib/africastalking.js';
import { ensureSaleCommissionForPayment } from '../_lib/database.js';

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

    const updateRequest = await getSupabase()
      .from('payment_requests')
      .update({
        status: paid ? 'completed' : 'failed',
        failure_reason: paid ? null : resultDescription,
        provider_response: body,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.id);

    if (updateRequest.error) throw updateRequest.error;

    if (paid) {
      const customer = paymentRequest.customers || {};
      if (receipt) {
        const existingPayment = await getSupabase()
          .from('payments')
          .select('id')
          .eq('receipt', receipt)
          .maybeSingle();

        if (existingPayment.error) throw existingPayment.error;
        if (existingPayment.data) {
          sendJson(res, 200, { ok: true, duplicate: true });
          return;
        }
      }

      const isDeposit = paymentRequest.source_portal === 'agent';
      const insertPayment = await getSupabase()
        .from('payments')
        .insert({
          customer_id: paymentRequest.customer_id,
          customer_name: customer.customer_name || 'Customer',
          customer_phone: customer.customer_phone || phone,
          product_type: customer.product_type || 'product',
          product_model: customer.product_model || customer.bike_model || null,
          agent_name: customer.agent_name || null,
          agent_id: customer.agent_id || null,
          bike_model: customer.bike_model || null,
          serial_number: customer.serial_number || null,
          chassis_number: customer.chassis_number || null,
          total_payable: Number(customer.total_payable || 0),
          paid_amount: amount,
          balance: Math.max(Number(customer.balance || 0) - amount, 0),
          deposit_credit: isDeposit ? amount : 0,
          paygo_payment: isDeposit ? 0 : amount,
          date: new Date().toISOString(),
          receipt,
          provider_reference: checkoutRequestId,
          provider_transaction_id: receipt,
          provider_account_reference: paymentRequest.customer_id,
          provider_payer_phone: String(phone || ''),
          provider_paid_at: paidAt,
          method: 'mpesa_daraja',
          status: 'paid',
          source_portal: 'customer'
        })
        .select()
        .single();

      if (insertPayment.error) throw insertPayment.error;
      await ensureSaleCommissionForPayment(insertPayment.data);

      const nextPaidAmount = Number(customer.paid_amount || 0) + amount;
      const nextBalance = Math.max(Number(customer.balance || customer.total_payable || 0) - amount, 0);
      const totalPayable = Number(customer.total_payable || 0);
      const repaymentPct = totalPayable > 0 ? Math.min(100, (nextPaidAmount / totalPayable) * 100) : 0;
      await getSupabase()
        .from('customers')
        .update({
          paid_amount: nextPaidAmount,
          balance: nextBalance,
          last_payment_date: new Date().toISOString().slice(0, 10),
          status: nextBalance <= 0 ? 'paid' : 'active'
        })
        .eq('id', paymentRequest.customer_id);

      await getSupabase()
        .from('customer_notifications')
        .insert({
          customer_id: paymentRequest.customer_id,
          title: 'Payment confirmed',
          message: `Payment of KES ${amount.toLocaleString('en-KE')} was confirmed.`,
          type: 'payment',
          status: 'unread'
        });

      await sendPaymentConfirmedSms({
        customer: { ...customer, customer_phone: customer.customer_phone || phone },
        amount,
        receipt,
        balance: nextBalance,
        repaymentPct
      }).catch(() => null);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
