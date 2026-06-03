import { sendPaymentConfirmedSms } from '../_lib/africastalking.js';
import { ensureSaleCommissionForPayment } from '../_lib/database.js';
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
    const body = await readJson(req);
    const transactionId = body.transactionId || body.provider_reference || body.id;
    const paid = String(body.status || '').toLowerCase() === 'success';
    const amount = parseAmount(body.value || body.amount);
    const phone = body.phoneNumber || body.phone;

    if (!transactionId) {
      sendJson(res, 400, { message: 'Missing Africa\'s Talking transactionId.' });
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
    const status = paid ? 'completed' : 'failed';
    const updateRequest = await getSupabase()
      .from('payment_requests')
      .update({
        status,
        failure_reason: paid ? null : body.description || 'Payment failed.',
        provider_response: body,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.id);

    if (updateRequest.error) throw updateRequest.error;

    if (paid) {
      const customer = paymentRequest.customers || {};
      const paidAmount = amount || Number(paymentRequest.amount || 0);
      const existingPayment = await getSupabase()
        .from('payments')
        .select('id')
        .eq('receipt', transactionId)
        .maybeSingle();

      if (existingPayment.error) throw existingPayment.error;
      if (existingPayment.data) {
        sendJson(res, 200, { ok: true, duplicate: true });
        return;
      }

      const nextPaidAmount = Number(customer.paid_amount || 0) + paidAmount;
      const nextBalance = Math.max(Number(customer.balance || customer.total_payable || 0) - paidAmount, 0);
      const totalPayable = Number(customer.total_payable || 0);
      const repaymentPct = totalPayable > 0 ? Math.min(100, (nextPaidAmount / totalPayable) * 100) : 0;
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
          total_payable: totalPayable,
          paid_amount: paidAmount,
          balance: nextBalance,
          deposit_credit: isDeposit ? paidAmount : 0,
          paygo_payment: isDeposit ? 0 : paidAmount,
          date: new Date().toISOString(),
          receipt: transactionId,
          provider_reference: transactionId,
          provider_transaction_id: transactionId,
          provider_account_reference: paymentRequest.customer_id,
          provider_payer_phone: String(phone || ''),
          provider_paid_at: new Date().toISOString(),
          method: 'mpesa_africastalking',
          status: 'paid',
          source_portal: 'customer'
        })
        .select()
        .single();

      if (insertPayment.error) throw insertPayment.error;
      await ensureSaleCommissionForPayment(insertPayment.data);

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
          message: `Payment of KES ${paidAmount.toLocaleString('en-KE')} was confirmed.`,
          type: 'payment',
          status: 'unread'
        });

      await sendPaymentConfirmedSms({
        customer: { ...customer, customer_phone: customer.customer_phone || phone },
        amount: paidAmount,
        receipt: transactionId,
        balance: nextBalance,
        repaymentPct
      }).catch(() => null);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
