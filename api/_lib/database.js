import crypto from 'node:crypto';
import { initiateAfricaB2CPayout, initiateAfricaCheckout, sendAgentFollowUpSms, sendCommissionPaidSms, sendNextOfKinAcceptanceSms, sendOtpSms, sendPaymentReminderSms, sendScreeningSms } from './africastalking.js';
import { getSupabase } from './supabase.js';
import { initiateB2CPayout, initiateStkPush } from './daraja.js';
import { validateStrongPassword } from './security.js';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapSupabaseError(error) {
  if (!error) return null;
  const mapped = new Error(error.message || 'Database request failed.');
  mapped.statusCode = 500;
  return mapped;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function nonEmpty(value) {
  return String(value || '').trim();
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function mapDisplayStatus(value, fallback = 'Pending') {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll('_', ' ');
}

export function hashOtp(identifier, otp) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(identifier)}:${otp}:${process.env.OTP_PEPPER || 'bumu-paygo'}`)
    .digest('hex');
}

export function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendOtpEmail(email, otp) {
  if (!process.env.RESEND_API_KEY || !process.env.OTP_FROM_EMAIL) {
    return { delivered: false, provider: 'not_configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL,
      to: email,
      subject: 'Bumu Paygo password reset OTP',
      text: `Your Bumu Paygo OTP is ${otp}. It expires in 10 minutes.`
    })
  });
  const data = await response.json().catch(() => ({}));

  return { delivered: response.ok, provider: 'resend', response: data };
}

async function sendOtp(body, email, otp) {
  const [emailDelivery, smsDelivery] = await Promise.all([
    sendOtpEmail(email, otp),
    body.phone ? sendOtpSms({ phone: body.phone, otp }).catch((error) => ({
      configured: true,
      delivered: false,
      provider: 'africastalking',
      error: error.message
    })) : Promise.resolve({ configured: false, delivered: false, provider: 'africastalking' })
  ]);

  return { email: emailDelivery, sms: smsDelivery };
}

async function findAuthUserByEmail(email) {
  const normalized = normalizeEmail(email);
  let page = 1;

  while (page <= 10) {
    const { data, error } = await getSupabase().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw mapSupabaseError(error);
    const user = data.users.find((item) => normalizeEmail(item.email) === normalized);
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

function paymentAmount(payment) {
  return Number(payment.deposit_credit || 0) + Number(payment.paygo_payment || 0);
}

function customerPaymentAmount(payment) {
  const splitAmount = Number(payment.deposit_credit || 0) + Number(payment.paygo_payment || 0);
  return splitAmount > 0 ? splitAmount : Number(payment.paid_amount || 0);
}

function normalizeLimit(value, fallback = 500, max = 1000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

function normalizeOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function applyRange(request, query = {}, fallbackLimit = 500) {
  const limit = normalizeLimit(query.limit, fallbackLimit);
  const offset = normalizeOffset(query.offset);
  return request.range(offset, offset + limit - 1);
}

function inferProductType(record) {
  const value = String(record.product_type || record.asset_type || record.bike_model || record.product_model || '').toLowerCase();
  if (value.includes('phone') || value.includes('tecno') || value.includes('samsung') || value.includes('infinix')) return 'phone';
  if (value.includes('bike') || value.includes('motor') || value.includes('boxer') || value.includes('tvs') || value.includes('bajaj')) return 'bike';
  return record.product_type || 'product';
}

function buildSaleCommissionsFromPayments(payments) {
  return payments
    .filter((payment) => Number(payment.deposit_credit || 0) > 0)
    .map((payment) => {
      const productType = inferProductType(payment);
      const deposit = Number(payment.deposit_credit || 0);
      const rate = productType === 'phone' ? 0.03 : 0.04;

      return {
        id: `COM-SALE-${payment.receipt || payment.id}`,
        payment_id: payment.id,
        agent_name: payment.agent_name || 'No agent',
        agent_code: payment.agent_id || 'No agent code',
        agent_phone: payment.agent_phone || null,
        customer_name: payment.customer_name,
        product_type: productType,
        product_model: payment.product_model || payment.bike_model || 'Product',
        serial_number: payment.serial_number || payment.chassis_number,
        chassis_number: payment.chassis_number || null,
        type: 'sale_activation_commission',
        amount: Math.round(deposit * rate),
        status: 'earned',
        earned_at: payment.date || payment.created_at || new Date().toISOString(),
        source_portal: 'finance'
      };
    });
}

export async function ensureSaleCommissionForPayment(payment) {
  if (Number(payment?.deposit_credit || 0) <= 0) return null;

  let agentPhone = payment.agent_phone || null;
  if (!agentPhone && payment.agent_id) {
    const agent = await getSupabase()
      .from('agents')
      .select('phone')
      .eq('agent_code', payment.agent_id)
      .maybeSingle();

    if (!agent.error && agent.data?.phone) agentPhone = agent.data.phone;
  }

  const [commission] = buildSaleCommissionsFromPayments([{ ...payment, agent_phone: agentPhone }]);
  if (!commission) return null;

  const result = await getSupabase()
    .from('commissions')
    .upsert(commission, { onConflict: 'id' })
    .select()
    .single();

  if (result.error) throw mapSupabaseError(result.error);
  return result.data;
}

function buildDashboard(payments, customers, commissions, reconciliation) {
  const trendByDate = payments.reduce((days, payment) => {
    const date = String(payment.date || payment.created_at || '').slice(0, 10);
    if (!date) return days;
    days.set(date, (days.get(date) || 0) + paymentAmount(payment));
    return days;
  }, new Map());

  const totalCollected = payments.reduce((total, payment) => total + paymentAmount(payment), 0);
  const expectedAmount = customers.reduce((total, customer) => total + Number(customer.total_payable || 0), 0);
  const overdueAmount = customers
    .filter((customer) => Number(customer.overdue_days || 0) > 0 || customer.status === 'defaulted')
    .reduce((total, customer) => total + Number(customer.balance || 0), 0);
  const pendingPayments = customers
    .filter((customer) => Number(customer.balance || 0) > 0)
    .reduce((total, customer) => total + Number(customer.balance || 0), 0);

  return {
    summary: {
      total_collected: totalCollected,
      expected_amount: expectedAmount,
      expected_collection: expectedAmount,
      pending_payments: pendingPayments,
      overdue_amount: overdueAmount,
      reconciliation_flags: reconciliation.filter((record) => record.status !== 'matched').length,
      unpaid_commissions: commissions
        .filter((commission) => commission.status !== 'paid')
        .reduce((total, commission) => total + Number(commission.amount || 0), 0),
      active_accounts: customers.filter((customer) => customer.status !== 'paid').length,
      today_collections: payments.filter((payment) => String(payment.date || '').startsWith(todayDate())).length,
      unpaid_payments: payments.filter((payment) => payment.status === 'unpaid').length,
      pending_commissions: commissions.filter((commission) => commission.status === 'earned').length
    },
    trend: [...trendByDate.entries()]
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([date, amount]) => ({ date, amount }))
  };
}

function financeReference(prefix = 'FIN') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function isAlreadySubmitted(status) {
  return ['processing', 'paid'].includes(String(status || '').toLowerCase());
}

function shouldUseAfricaPayouts() {
  const payoutProvider = String(process.env.COMMISSION_PAYOUT_PROVIDER || process.env.PAYOUT_PROVIDER || '').toLowerCase();
  if (payoutProvider) return payoutProvider === 'africastalking';
  const paymentProvider = String(process.env.PAYMENT_PROVIDER || '').toLowerCase();
  return paymentProvider ? paymentProvider === 'africastalking' : true;
}

function shouldUseAfricaCheckout() {
  const provider = String(process.env.MPESA_PROVIDER || process.env.PAYMENT_PROVIDER || '').toLowerCase();
  return provider ? provider === 'africastalking' : true;
}

async function queueCommissionPayout(commission, referencePrefix = 'FIN') {
  if (!commission?.id) {
    const error = new Error('Commission not found.');
    error.statusCode = 404;
    throw error;
  }

  if (commission.status === 'paid') {
    return { commission, payoutRequest: null };
  }

  if (isAlreadySubmitted(commission.status)) {
    return { commission, payoutRequest: null };
  }

  const requestedAt = new Date().toISOString();
  const approvalReference = financeReference(referencePrefix);
  if (!commission.agent_phone) {
    const error = new Error('Agent phone is required before payout can be sent.');
    error.statusCode = 400;
    throw error;
  }

  const payoutRecord = {
    commission_id: commission.id,
    agent_name: commission.agent_name,
    agent_code: commission.agent_code,
    agent_phone: commission.agent_phone,
    amount: Number(commission.amount || 0),
    status: 'queued',
    finance_approval_reference: approvalReference,
    requested_at: requestedAt
  };

  const payoutRequest = await getSupabase()
    .from('agent_payout_requests')
    .upsert(payoutRecord, { onConflict: 'commission_id' })
    .select()
    .single();

  if (payoutRequest.error) throw mapSupabaseError(payoutRequest.error);

  let payoutStatus = 'queued';
  let providerResponse = {};
  let backendReference = null;
  let payoutError = null;

  try {
    if (shouldUseAfricaPayouts()) {
      const africa = await initiateAfricaB2CPayout({
        amount: payoutRecord.amount,
        phone: payoutRecord.agent_phone,
        commissionId: commission.id,
        approvalReference,
        agentName: commission.agent_name
      });
      payoutStatus = africa.status;
      providerResponse = africa.providerResponse || {};
      backendReference = africa.transactionId || null;
    } else {
      const daraja = await initiateB2CPayout({
        amount: payoutRecord.amount,
        phone: payoutRecord.agent_phone,
        remarks: `Commission ${commission.id}`,
        occasion: approvalReference
      });
      payoutStatus = daraja.status;
      providerResponse = daraja.providerResponse || {};
      backendReference = daraja.conversationId || daraja.originatorConversationId || null;
    }
  } catch (error) {
    payoutStatus = 'failed';
    providerResponse = error.providerResponse || {};
    payoutError = error.message;
  }

  const payoutUpdate = await getSupabase()
    .from('agent_payout_requests')
    .update({
      status: payoutStatus,
      backend_reference: backendReference,
      provider_reference: backendReference,
      provider_response: providerResponse,
      processed_at: payoutStatus === 'failed' ? new Date().toISOString() : null
    })
    .eq('id', payoutRequest.data.id)
    .select()
    .single();

  if (payoutUpdate.error) throw mapSupabaseError(payoutUpdate.error);

  const updated = await getSupabase()
    .from('commissions')
    .update({
      status: payoutStatus === 'paid' ? 'paid' : payoutStatus === 'failed' ? 'failed' : 'processing',
      paid_at: payoutStatus === 'paid' ? new Date().toISOString() : null,
      finance_approved_at: requestedAt,
      finance_approval_reference: approvalReference,
      payout_status: payoutStatus,
      payout_requested_at: requestedAt,
      payout_completed_at: payoutStatus === 'paid' ? new Date().toISOString() : null,
      payout_reference: backendReference || payoutRequest.data?.id || null,
      provider_response: providerResponse,
      payout_error: payoutError
    })
    .eq('id', commission.id)
    .select()
    .single();

  if (updated.error) throw mapSupabaseError(updated.error);
  if (payoutStatus === 'paid') {
    await sendCommissionPaidSms({ commission: updated.data }).catch(() => null);
  }
  return { commission: updated.data, payoutRequest: payoutUpdate.data };
}

export async function listPayments(query = {}) {
  const request = getSupabase()
    .from('payments')
    .select('*')
    .order('date', { ascending: false });
  const { data, error } = await applyRange(request, query);

  if (error) throw mapSupabaseError(error);
  return { payments: data || [] };
}

export async function failPaymentRequest(paymentRequestId, { reason, providerResponse = {} } = {}) {
  const result = await getSupabase()
    .from('payment_requests')
    .update({
      status: 'failed',
      failure_reason: reason || 'Payment failed.',
      provider_response: providerResponse,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRequestId)
    .select()
    .single();

  if (result.error) throw mapSupabaseError(result.error);
  return result.data;
}

export async function completePaymentRequest(paymentRequest, {
  amount,
  phone,
  receipt,
  providerReference,
  providerTransactionId,
  providerResponse = {},
  paidAt,
  method = 'mpesa'
} = {}) {
  const customer = paymentRequest.customers || {};
  const transactionId = providerTransactionId || receipt || providerReference;
  const paymentReceipt = receipt || transactionId || paymentRequest.provider_reference || paymentRequest.id;
  const paidAmount = Number(amount || paymentRequest.amount || 0);

  if (!paidAmount || paidAmount <= 0) {
    const error = new Error('Payment callback amount is missing or invalid.');
    error.statusCode = 400;
    throw error;
  }

  const existingPayment = await getSupabase()
    .from('payments')
    .select('id')
    .or(`receipt.eq.${paymentReceipt},provider_transaction_id.eq.${transactionId || paymentReceipt},provider_reference.eq.${providerReference || paymentReceipt}`)
    .limit(1)
    .maybeSingle();

  if (existingPayment.error) throw mapSupabaseError(existingPayment.error);
  if (existingPayment.data) {
    await getSupabase()
      .from('payment_requests')
      .update({
        status: 'completed',
        failure_reason: null,
        provider_response: providerResponse,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.id);
    return { duplicate: true, payment: existingPayment.data };
  }

  const nextPaidAmount = Number(customer.paid_amount || 0) + paidAmount;
  const nextBalance = Math.max(Number(customer.balance || customer.total_payable || 0) - paidAmount, 0);
  const totalPayable = Number(customer.total_payable || 0);
  const repaymentPct = totalPayable > 0 ? Math.min(100, (nextPaidAmount / totalPayable) * 100) : 0;
  const isDeposit = paymentRequest.source_portal === 'agent';
  const completedAt = paidAt || new Date().toISOString();

  const updateRequest = await getSupabase()
    .from('payment_requests')
    .update({
      status: 'completed',
      failure_reason: null,
      provider_response: providerResponse,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRequest.id);

  if (updateRequest.error) throw mapSupabaseError(updateRequest.error);

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
      date: completedAt,
      receipt: paymentReceipt,
      provider_reference: providerReference || paymentRequest.provider_reference || paymentRequest.backend_reference || null,
      provider_transaction_id: transactionId || null,
      provider_account_reference: paymentRequest.customer_id,
      provider_payer_phone: String(phone || ''),
      provider_paid_at: completedAt,
      method,
      status: 'paid',
      source_portal: paymentRequest.source_portal || 'customer'
    })
    .select()
    .single();

  if (insertPayment.error) throw mapSupabaseError(insertPayment.error);
  await ensureSaleCommissionForPayment(insertPayment.data);

  const updateCustomer = await getSupabase()
    .from('customers')
    .update({
      paid_amount: nextPaidAmount,
      balance: nextBalance,
      last_payment_date: completedAt.slice(0, 10),
      status: nextBalance <= 0 ? 'paid' : 'active',
      overdue_days: nextBalance <= 0 ? 0 : Number(customer.overdue_days || 0)
    })
    .eq('id', paymentRequest.customer_id);

  if (updateCustomer.error) throw mapSupabaseError(updateCustomer.error);

  const sideEffects = await Promise.all([
    getSupabase()
      .from('customer_notifications')
      .insert({
        customer_id: paymentRequest.customer_id,
        title: 'Payment confirmed',
        message: `Payment of KES ${paidAmount.toLocaleString('en-KE')} was confirmed.`,
        type: 'payment',
        status: 'unread'
      }),
    getSupabase()
      .from('finance_notifications')
      .insert({
        type: 'payment_confirmed',
        title: 'Payment confirmed',
        message: `${customer.customer_name || 'Customer'} paid KES ${paidAmount.toLocaleString('en-KE')}.`,
        issue: 'Provider callback was received and matched to a payment request.',
        follow_up: 'Review reconciliation only if the amount or account looks unusual.',
        customer_id: paymentRequest.customer_id,
        customer_name: customer.customer_name || '',
        customer_phone: customer.customer_phone || phone || '',
        agent_name: customer.agent_name || null,
        agent_code: customer.agent_id || null,
        amount: paidAmount,
        balance: nextBalance,
        overdue_days: Number(customer.overdue_days || 0),
        source_portal: paymentRequest.source_portal || 'backend',
        severity: 'success',
        status: 'unread'
      }),
    getSupabase()
      .from('reconciliation')
      .insert({
        payment_id: insertPayment.data.id,
        receipt: paymentReceipt,
        customer_name: customer.customer_name || 'Customer',
        national_id: customer.national_id || null,
        provider_amount: paidAmount,
        system_amount: paidAmount,
        date: completedAt.slice(0, 10),
        status: 'matched',
        source_portal: 'backend'
      })
  ]);

  sideEffects.forEach((result) => {
    if (result.error) throw mapSupabaseError(result.error);
  });

  return {
    duplicate: false,
    payment: insertPayment.data,
    customer,
    paidAmount,
    nextBalance,
    repaymentPct
  };
}

export async function findCustomerForAuthUser(user) {
  const supabase = getSupabase();
  const userEmail = normalizeEmail(user?.email);

  let request = supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  let { data, error } = await request;
  if (error) throw mapSupabaseError(error);
  if (data) return data;

  if (!userEmail) return null;

  const byEmail = await supabase
    .from('customers')
    .select('*')
    .ilike('email', userEmail)
    .maybeSingle();

  if (byEmail.error) throw mapSupabaseError(byEmail.error);
  if (!byEmail.data) return null;

  if (!byEmail.data.auth_user_id) {
    const linked = await supabase
      .from('customers')
      .update({ auth_user_id: user.id })
      .eq('id', byEmail.data.id)
      .select()
      .single();

    if (linked.error) throw mapSupabaseError(linked.error);
    return linked.data;
  }

  return byEmail.data;
}

export async function getCustomerPortal(user) {
  const customer = await findCustomerForAuthUser(user);

  if (!customer) {
    const error = new Error('Customer profile is not connected yet. Ask admin to link this email to a customer record.');
    error.statusCode = 403;
    throw error;
  }

  if (customer.customer_activation_otp_status !== 'verified') {
    const error = new Error('Activate your customer account with the OTP sent after approval before opening the portal.');
    error.statusCode = 403;
    throw error;
  }

  const [paymentsResult, notificationsResult, requestsResult] = await Promise.all([
    getSupabase()
      .from('payments')
      .select('*')
      .eq('customer_id', customer.id)
      .order('date', { ascending: false })
      .limit(100),
    getSupabase()
      .from('customer_notifications')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(100),
    getSupabase()
      .from('payment_requests')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  [paymentsResult, notificationsResult, requestsResult].forEach(({ error }) => {
    if (error) throw mapSupabaseError(error);
  });

  const payments = paymentsResult.data || [];
  const completedPayments = payments.filter((payment) => ['paid', 'completed'].includes(String(payment.status || '').toLowerCase()));
  const totalPaid = completedPayments.reduce((total, payment) => total + customerPaymentAmount(payment), 0);
  const totalPayable = Number(customer.total_payable || 0);
  const balance = Number(customer.balance || Math.max(totalPayable - totalPaid, 0));
  const dailyInstallment = Number(customer.daily_installment || 0);

  return {
    customer: {
      id: customer.id,
      name: customer.customer_name,
      phone: customer.customer_phone || '',
      email: customer.email || '',
      nationalId: customer.national_id || '',
      agentName: customer.agent_name || '',
      agentCode: customer.agent_id || ''
    },
    product: {
      type: customer.product_type || 'product',
      model: customer.product_model || customer.bike_model || '',
      serialNumber: customer.serial_number || '',
      chassisNumber: customer.chassis_number || '',
      totalPrice: totalPayable,
      dailyInstallment,
      dueDate: customer.due_date || '',
      lastPaymentDate: customer.last_payment_date || '',
      status: mapDisplayStatus(customer.status, 'Active')
    },
    summary: {
      totalPaid,
      balance,
      progress: totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0,
      overdueDays: Number(customer.overdue_days || 0),
      pendingRequests: (requestsResult.data || []).filter((request) => request.status === 'pending').length
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      date: formatDate(payment.date || payment.provider_paid_at || payment.created_at),
      amount: customerPaymentAmount(payment),
      receipt: payment.receipt || payment.provider_transaction_id || '',
      method: payment.method || 'paybill',
      phone: payment.provider_payer_phone || payment.customer_phone || '',
      status: mapDisplayStatus(payment.status)
    })),
    notifications: (notificationsResult.data || []).map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      unread: notification.status === 'unread',
      date: formatDate(notification.created_at)
    })),
    paymentRequests: (requestsResult.data || []).map((request) => ({
      id: request.id,
      amount: Number(request.amount || 0),
      phone: request.phone || '',
      status: mapDisplayStatus(request.status),
      createdAt: formatDate(request.created_at)
    }))
  };
}

async function startCustomerCheckoutRequest(customer, { amount, phone, sourcePortal = 'customer', narration = 'Bumu Paygo Installment' }) {
  const { data, error } = await getSupabase()
    .from('payment_requests')
    .insert({
      customer_id: customer.id,
      amount,
      phone,
      status: 'pending',
      source_portal: sourcePortal
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);

  let request = data;

  try {
    const provider = shouldUseAfricaCheckout()
      ? await initiateAfricaCheckout({
          amount,
          phone,
          customerId: customer.id,
          customerBikeId: customer.serial_number || customer.chassis_number || customer.id,
          narration
        })
      : await initiateStkPush({
          amount,
          phone,
          accountReference: customer.id,
          transactionDescription: narration || `Bumu Paygo ${customer.customer_name}`
        });
    const updated = await getSupabase()
      .from('payment_requests')
      .update({
        status: provider.status === 'queued' ? 'pending' : provider.status,
        provider_reference: provider.checkoutRequestId || provider.transactionId || data.id,
        backend_reference: provider.merchantRequestId || provider.transactionId || null,
        provider_response: provider.providerResponse || {},
        failure_reason: null
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updated.error) throw mapSupabaseError(updated.error);
    request = updated.data;
  } catch (error) {
    const failed = await getSupabase()
      .from('payment_requests')
      .update({
        status: 'failed',
        failure_reason: error.message,
        provider_response: error.providerResponse || {}
      })
      .eq('id', data.id)
      .select()
      .single();

    if (failed.error) throw mapSupabaseError(failed.error);
    request = failed.data;
  }

  await getSupabase()
    .from('customer_notifications')
    .insert({
      customer_id: customer.id,
      title: 'Payment request received',
      message: `Your payment request for KES ${amount.toLocaleString('en-KE')} has been received.`,
      type: 'payment',
      status: 'unread'
    });

  return request;
}

export async function createCustomerPaymentRequest(user, body) {
  const customer = await findCustomerForAuthUser(user);

  if (!customer) {
    const error = new Error('Customer profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const amount = Number(body.amount || 0);
  const phone = String(body.phone || customer.customer_phone || '').trim();

  if (!amount || amount <= 0 || !phone) {
    const error = new Error('Enter a valid amount and payment phone number.');
    error.statusCode = 400;
    throw error;
  }

  const request = await startCustomerCheckoutRequest(customer, {
    amount,
    phone,
    sourcePortal: 'customer',
    narration: 'Bumu Paygo Installment'
  });

  return { paymentRequest: request };
}

export async function createCustomerPasswordResetRequest(body) {
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();

  if (!email || !phone) {
    const error = new Error('Enter your email and phone number.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('password_reset_requests')
    .insert({
      email,
      phone,
      status: 'otp_required',
      source_portal: 'customer'
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  return { request: data };
}

export async function createAgentPasswordResetRequest(body) {
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();

  if (!email || !phone) {
    const error = new Error('Enter your email and phone number.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('password_reset_requests')
    .insert({
      email,
      phone,
      status: 'otp_required',
      source_portal: 'agent'
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  return { request: data };
}

export async function requestPasswordResetOtp(body) {
  const identifier = normalizeEmail(body.identifier || body.email);

  if (!identifier || !identifier.includes('@')) {
    const error = new Error('Enter your email to receive OTP.');
    error.statusCode = 400;
    throw error;
  }

  const user = await findAuthUserByEmail(identifier);
  if (!user) {
    return { sent: true, delivered: false };
  }

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const delivery = await sendOtp(body, identifier, otp);
  const delivered = Boolean(delivery.email?.delivered || delivery.sms?.delivered);

  const { data, error } = await getSupabase()
    .from('password_reset_requests')
    .insert({
      email: identifier,
      phone: body.phone || '',
      otp_hash: hashOtp(identifier, otp),
      status: delivered ? 'otp_sent' : 'otp_required',
      source_portal: body.sourcePortal || body.source_portal || 'finance',
      otp_expires_at: expiresAt,
      provider_response: delivery
    })
    .select('id,email,status,otp_expires_at,source_portal,created_at')
    .single();

  if (error) throw mapSupabaseError(error);

  return {
    sent: true,
    delivered,
    request: data,
    message: delivered
      ? 'OTP sent. If it does not arrive, go back and resend it.'
      : 'OTP request saved. Configure RESEND_API_KEY/OTP_FROM_EMAIL or AFRICASTALKING_* variables to send OTP automatically.'
  };
}

export async function verifyPasswordResetOtp(body) {
  const identifier = normalizeEmail(body.identifier || body.email);
  const otp = String(body.otp || '').trim();

  if (!identifier || !/^\d{6}$/.test(otp)) {
    const error = new Error('Enter the 6-digit OTP.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('password_reset_requests')
    .select('*')
    .eq('email', identifier)
    .in('status', ['otp_sent', 'otp_required'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw mapSupabaseError(error);

  if (!data || data.otp_hash !== hashOtp(identifier, otp) || new Date(data.otp_expires_at).getTime() < Date.now()) {
    const invalid = new Error('Invalid or expired OTP.');
    invalid.statusCode = 400;
    throw invalid;
  }

  const updated = await getSupabase()
    .from('password_reset_requests')
    .update({
      status: 'verified',
      otp_verified_at: new Date().toISOString()
    })
    .eq('id', data.id)
    .select('id,email,status,otp_verified_at')
    .single();

  if (updated.error) throw mapSupabaseError(updated.error);
  return { verified: true, request: updated.data };
}

export async function resetPasswordWithOtp(body) {
  const identifier = normalizeEmail(body.identifier || body.email);
  const otp = String(body.otp || '').trim();
  const password = String(body.password || '');

  if (!identifier || !/^\d{6}$/.test(otp) || !validateStrongPassword(password)) {
    const error = new Error('Verify OTP and enter a valid new password.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('password_reset_requests')
    .select('*')
    .eq('email', identifier)
    .in('status', ['verified', 'otp_sent', 'otp_required'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw mapSupabaseError(error);

  if (!data || data.otp_hash !== hashOtp(identifier, otp) || new Date(data.otp_expires_at).getTime() < Date.now()) {
    const invalid = new Error('Invalid or expired OTP.');
    invalid.statusCode = 400;
    throw invalid;
  }

  const user = await findAuthUserByEmail(identifier);
  if (!user) {
    const missing = new Error('Account was not found.');
    missing.statusCode = 404;
    throw missing;
  }

  const updateUser = await getSupabase().auth.admin.updateUserById(user.id, { password });
  if (updateUser.error) throw mapSupabaseError(updateUser.error);

  const updated = await getSupabase()
    .from('password_reset_requests')
    .update({
      status: 'completed',
      otp_verified_at: data.otp_verified_at || new Date().toISOString()
    })
    .eq('id', data.id)
    .select('id,email,status')
    .single();

  if (updated.error) throw mapSupabaseError(updated.error);
  return { updated: true, request: updated.data };
}

export async function findAgentForAuthUser(user) {
  const userEmail = normalizeEmail(user?.email);
  let { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw mapSupabaseError(error);
  if (data) return data;
  if (!userEmail) return null;

  const byEmail = await getSupabase()
    .from('agents')
    .select('*')
    .ilike('email', userEmail)
    .maybeSingle();

  if (byEmail.error) throw mapSupabaseError(byEmail.error);
  if (!byEmail.data) return null;

  if (!byEmail.data.auth_user_id) {
    const linked = await getSupabase()
      .from('agents')
      .update({ auth_user_id: user.id })
      .eq('id', byEmail.data.id)
      .select()
      .single();

    if (linked.error) throw mapSupabaseError(linked.error);
    return linked.data;
  }

  return byEmail.data;
}

export async function getAgentPortal(user) {
  const agent = await findAgentForAuthUser(user);

  if (!agent) {
    const error = new Error('Agent profile is not connected yet. Ask admin to approve or link this email.');
    error.statusCode = 403;
    throw error;
  }

  if (agent.status !== 'active') {
    const error = new Error('Your agent account is waiting for admin approval.');
    error.statusCode = 403;
    throw error;
  }

  const agentCode = agent.agent_code || agent.agent_id;
  const agentName = agent.full_name || agent.agent_name;

  const customerRequest = getSupabase()
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const commissionRequest = getSupabase()
    .from('commissions')
    .select('*')
    .order('earned_at', { ascending: false })
    .limit(100);
  const notificationRequest = getSupabase()
    .from('agent_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const [customersResult, commissionsResult, notificationsResult, tasksResult] = await Promise.all([
    agentCode ? customerRequest.eq('agent_id', agentCode) : customerRequest.eq('agent_name', agentName),
    agentCode ? commissionRequest.eq('agent_code', agentCode) : commissionRequest.eq('agent_name', agentName),
    agentCode ? notificationRequest.eq('agent_code', agentCode) : notificationRequest.eq('agent_name', agentName),
    getSupabase()
      .from('agent_tasks')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(100)
  ]);

  [customersResult, commissionsResult, notificationsResult, tasksResult].forEach(({ error }) => {
    if (error) throw mapSupabaseError(error);
  });

  const customers = customersResult.data || [];
  const commissions = commissionsResult.data || [];
  const tasks = tasksResult.data || [];
  const assignedBalance = customers.reduce((total, customer) => total + Number(customer.balance || 0), 0);
  const paidCommissions = commissions
    .filter((commission) => commission.status === 'paid')
    .reduce((total, commission) => total + Number(commission.amount || 0), 0);
  const pendingCommissions = commissions
    .filter((commission) => commission.status !== 'paid')
    .reduce((total, commission) => total + Number(commission.amount || 0), 0);

  return {
    agent: {
      id: agent.id,
      code: agentCode || '',
      name: user?.user_metadata?.full_name || agentName || '',
      profileName: agentName || '',
      email: agent.email || '',
      phone: agent.phone || '',
      region: agent.region || '',
      status: agent.status || 'active'
    },
    summary: {
      assignedCustomers: customers.length,
      overdueCustomers: customers.filter((customer) => Number(customer.overdue_days || 0) > 0 || customer.status === 'defaulted').length,
      assignedBalance,
      paidCommissions,
      pendingCommissions,
      openTasks: tasks.filter((task) => task.status === 'open').length
    },
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.customer_name,
      phone: customer.customer_phone || '',
      productType: customer.product_type || 'product',
      productModel: customer.product_model || customer.bike_model || '',
      serialNumber: customer.serial_number || '',
      chassisNumber: customer.chassis_number || '',
      totalPayable: Number(customer.total_payable || 0),
      paidAmount: Number(customer.paid_amount || 0),
      balance: Number(customer.balance || 0),
      dueDate: customer.due_date || '',
      status: mapDisplayStatus(customer.status, 'Active'),
      overdueDays: Number(customer.overdue_days || 0)
    })),
    commissions: commissions.map((commission) => ({
      id: commission.id,
      customerName: commission.customer_name || '',
      productType: commission.product_type || 'product',
      productModel: commission.product_model || '',
      amount: Number(commission.amount || 0),
      status: mapDisplayStatus(commission.status),
      earnedAt: formatDate(commission.earned_at)
    })),
    notifications: (notificationsResult.data || []).map((notification) => ({
      id: notification.id,
      title: notification.customer_name || 'Agent notification',
      message: notification.message,
      status: notification.status,
      date: formatDate(notification.created_at)
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      note: task.note || '',
      status: task.status,
      dueLabel: task.due_label || '',
      createdAt: formatDate(task.created_at)
    }))
  };
}

export async function createAgentCustomer(user, body) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const customerName = nonEmpty(body.customerName);
  const customerPhone = nonEmpty(body.customerPhone);
  const nationalId = nonEmpty(body.nationalId);
  const dateOfBirth = nonEmpty(body.dateOfBirth || body.date_of_birth);
  const gender = nonEmpty(body.gender);
  const location = nonEmpty(body.location);
  const occupation = nonEmpty(body.occupation);
  const passportPhotoUrl = nonEmpty(body.passportPhotoUrl || body.passport_photo_url);
  const idFrontUrl = nonEmpty(body.idFrontUrl || body.id_front_url);
  const idBackUrl = nonEmpty(body.idBackUrl || body.id_back_url);
  const nextOfKinName = nonEmpty(body.nextOfKinName || body.next_of_kin_name);
  const nextOfKinPhone = nonEmpty(body.nextOfKinPhone || body.next_of_kin_phone);
  const nextOfKinRelationship = nonEmpty(body.nextOfKinRelationship || body.next_of_kin_relationship);
  const nextOfKinNationalId = nonEmpty(body.nextOfKinNationalId || body.next_of_kin_national_id);
  const nextOfKinGender = nonEmpty(body.nextOfKinGender || body.next_of_kin_gender);
  const nextOfKinLocation = nonEmpty(body.nextOfKinLocation || body.next_of_kin_location);
  const nextOfKinOccupation = nonEmpty(body.nextOfKinOccupation || body.next_of_kin_occupation);
  const nextOfKinPassportPhotoUrl = nonEmpty(body.nextOfKinPassportPhotoUrl || body.next_of_kin_passport_photo_url);
  const nextOfKinIdFrontUrl = nonEmpty(body.nextOfKinIdFrontUrl || body.next_of_kin_id_front_url);
  const nextOfKinIdBackUrl = nonEmpty(body.nextOfKinIdBackUrl || body.next_of_kin_id_back_url);
  const productType = nonEmpty(body.productType) || 'product';
  const productModel = nonEmpty(body.productModel || body.bikeModel);
  const serialNumber = nonEmpty(body.serialNumber);
  const chassisNumber = nonEmpty(body.chassisNumber);
  const dueDate = nonEmpty(body.dueDate);

  const required = [
    ['customer name', customerName],
    ['customer phone', customerPhone],
    ['national ID', nationalId],
    ['date of birth', dateOfBirth],
    ['gender', gender],
    ['location', location],
    ['occupation', occupation],
    ['customer passport photo', passportPhotoUrl],
    ['customer ID front photo', idFrontUrl],
    ['customer ID back photo', idBackUrl],
    ['next-of-kin name', nextOfKinName],
    ['next-of-kin phone', nextOfKinPhone],
    ['next-of-kin relationship', nextOfKinRelationship],
    ['next-of-kin national ID', nextOfKinNationalId],
    ['next-of-kin gender', nextOfKinGender],
    ['next-of-kin location', nextOfKinLocation],
    ['next-of-kin occupation', nextOfKinOccupation],
    ['next-of-kin passport photo', nextOfKinPassportPhotoUrl],
    ['next-of-kin ID front photo', nextOfKinIdFrontUrl],
    ['next-of-kin ID back photo', nextOfKinIdBackUrl],
    ['product type', productType],
    ['product model', productModel],
    ['serial number or chassis number', serialNumber || chassisNumber],
    ['due date', dueDate]
  ];
  const missing = required.filter(([, value]) => !value).map(([label]) => label);

  if (missing.length > 0) {
    const error = new Error(`Complete required fields: ${missing.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  const totalPayable = Number(body.totalPayable || 0);
  const depositAmount = Number(body.depositAmount || body.paidAmount || 0);
  const dailyInstallment = Number(body.dailyInstallment || 0);
  if (!Number.isFinite(totalPayable) || totalPayable <= 0 || !Number.isFinite(dailyInstallment) || dailyInstallment <= 0 || !Number.isFinite(depositAmount) || depositAmount <= 0 || depositAmount > totalPayable) {
    const error = new Error('Enter valid total payable, deposit amount, and daily installment.');
    error.statusCode = 400;
    throw error;
  }

  const agentCode = agent.agent_code || agent.agent_id;
  const nextOfKinOtp = nextOfKinPhone ? createOtp() : '';
  const nextOfKinOtpExpiresAt = nextOfKinOtp ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;
  let nextOfKinOtpDelivery = { configured: false, delivered: false, provider: 'africastalking' };
  const duplicateCheck = nationalId
    ? await getSupabase()
        .from('customers')
        .select('id')
        .eq('national_id', nationalId)
        .limit(1)
    : { data: [] };

  if (duplicateCheck.error) throw mapSupabaseError(duplicateCheck.error);
  const duplicateNationalId = Boolean(duplicateCheck.data?.length);

  const { data, error } = await getSupabase()
    .from('customers')
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      national_id: nationalId,
      email: normalizeEmail(body.email) || null,
      date_of_birth: dateOfBirth,
      gender,
      location,
      occupation,
      passport_photo_url: passportPhotoUrl,
      id_front_url: idFrontUrl,
      id_back_url: idBackUrl,
      next_of_kin_name: nextOfKinName,
      next_of_kin_phone: nextOfKinPhone,
      next_of_kin_relationship: nextOfKinRelationship,
      next_of_kin_national_id: nextOfKinNationalId,
      next_of_kin_gender: nextOfKinGender,
      next_of_kin_location: nextOfKinLocation,
      next_of_kin_occupation: nextOfKinOccupation,
      next_of_kin_passport_photo_url: nextOfKinPassportPhotoUrl,
      next_of_kin_id_front_url: nextOfKinIdFrontUrl,
      next_of_kin_id_back_url: nextOfKinIdBackUrl,
      next_of_kin_otp_hash: nextOfKinOtp ? hashOtp(nextOfKinPhone, nextOfKinOtp) : null,
      next_of_kin_otp_expires_at: nextOfKinOtpExpiresAt,
      next_of_kin_otp_sent_at: null,
      next_of_kin_otp_status: nextOfKinOtp ? 'not_sent' : 'not_sent',
      product_type: productType,
      product_model: productModel,
      bike_model: productType === 'bike' ? productModel : null,
      serial_number: serialNumber || chassisNumber,
      chassis_number: chassisNumber || null,
      agent_name: agent.full_name || agent.agent_name,
      agent_id: agentCode,
      total_payable: totalPayable,
      paid_amount: 0,
      balance: totalPayable,
      due_date: dueDate,
      daily_installment: dailyInstallment,
      application_status: nextOfKinOtp ? 'next_of_kin_pending' : 'pending_screening',
      status: nextOfKinOtp ? 'next_of_kin_pending' : 'pending_screening',
      source_portal: 'agent'
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  const application = await getSupabase()
    .from('customer_applications')
    .insert({
      customer_id: data.id,
      agent_id: agentCode,
      agent_name: agent.full_name || agent.agent_name,
      national_id: nationalId || null,
      status: nextOfKinOtp ? 'next_of_kin_pending' : 'pending_screening',
      duplicate_national_id: duplicateNationalId,
      source_portal: 'agent'
    })
    .select()
    .single();

  if (application.error) throw mapSupabaseError(application.error);

  if (nextOfKinOtp) {
    const publicBaseUrl = String(process.env.PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
    const appBaseUrl = publicBaseUrl
      ? (publicBaseUrl.startsWith('http') ? publicBaseUrl : `https://${publicBaseUrl}`)
      : 'https://bumu-beta.vercel.app';
    const acceptUrl = `${appBaseUrl}/#/next-of-kin?customer=${encodeURIComponent(data.id)}&otp=${encodeURIComponent(nextOfKinOtp)}`;
    nextOfKinOtpDelivery = await sendNextOfKinAcceptanceSms({
      phone: nextOfKinPhone,
      otp: nextOfKinOtp,
      customerName,
      acceptUrl
    }).catch((deliveryError) => ({
      configured: true,
      delivered: false,
      provider: 'africastalking',
      error: deliveryError.message
    }));

    const sentAt = new Date().toISOString();
    const updateOtpDelivery = await getSupabase()
      .from('customers')
      .update({
        next_of_kin_otp_sent_at: nextOfKinOtpDelivery.delivered ? sentAt : null,
        next_of_kin_otp_status: nextOfKinOtpDelivery.delivered ? 'sent' : 'failed'
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updateOtpDelivery.error) throw mapSupabaseError(updateOtpDelivery.error);
    data.next_of_kin_otp_sent_at = updateOtpDelivery.data.next_of_kin_otp_sent_at;
    data.next_of_kin_otp_status = updateOtpDelivery.data.next_of_kin_otp_status;

    if (!nextOfKinOtpDelivery.delivered) {
      const deliveryError = new Error('Next-of-kin acceptance SMS could not be sent. Check Africa\'s Talking SMS settings before submitting this application.');
      deliveryError.statusCode = 502;
      throw deliveryError;
    }
  }

  const paymentRequest = await startCustomerCheckoutRequest(data, {
    amount: depositAmount,
    phone: customerPhone,
    sourcePortal: 'agent',
    narration: 'Bumu Paygo Deposit'
  });

  if (!nextOfKinOtp) {
    await createScreeningNotification({ customer: data, agent, duplicateNationalId, agentCode });
  }

  return {
    customer: data,
    paymentRequest,
    nextOfKinOtpRequired: Boolean(nextOfKinOtp),
    otpDelivery: nextOfKinOtpDelivery
  };
}

async function createScreeningNotification({ customer, agent, duplicateNationalId, agentCode }) {
  await getSupabase()
    .from('finance_notifications')
    .insert({
      type: duplicateNationalId ? 'screening_duplicate' : 'screening_auto_approved',
      title: duplicateNationalId ? 'Duplicate national ID rejected' : 'Customer automatically approved',
      message: `${customer.customer_name} was submitted by ${agent.full_name || agent.agent_name || 'agent'} and screened automatically.`,
      issue: duplicateNationalId ? 'National ID already exists in customer records.' : 'Next-of-kin OTP was verified and the activation OTP was sent to the customer.',
      follow_up: duplicateNationalId ? 'Review the rejected application in Admin portal.' : 'Track activation, deposit payment, and repayment progress.',
      customer_id: customer.id,
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      agent_name: agent.full_name || agent.agent_name,
      agent_code: agentCode,
      severity: duplicateNationalId ? 'critical' : 'info',
      source_portal: 'agent'
    });
}

function activationSmsWasDelivered(result) {
  return Boolean(result?.customer?.delivered);
}

async function completeNextOfKinAcceptance({ customerId, otp, agent }) {
  const customerQuery = getSupabase()
    .from('customers')
    .select('*')
    .eq('id', customerId);

  if (!agent) {
    const customerResult = await customerQuery.maybeSingle();
    if (customerResult.error) throw mapSupabaseError(customerResult.error);
    if (!customerResult.data) {
      const error = new Error('Next-of-kin request was not found.');
      error.statusCode = 404;
      throw error;
    }
    const foundAgent = customerResult.data.agent_id
      ? await getSupabase().from('agents').select('*').eq('agent_code', customerResult.data.agent_id).maybeSingle()
      : { data: null };
    if (foundAgent.error) throw mapSupabaseError(foundAgent.error);
    agent = foundAgent.data || {
      agent_code: customerResult.data.agent_id,
      agent_id: customerResult.data.agent_id,
      full_name: customerResult.data.agent_name,
      agent_name: customerResult.data.agent_name
    };
    return completeNextOfKinAcceptance({ customerId, otp, agent });
  }

  if (agent.agent_code || agent.agent_id) {
    customerQuery.eq('agent_id', agent.agent_code || agent.agent_id);
  }

  const customerResult = await customerQuery.maybeSingle();

  if (customerResult.error) throw mapSupabaseError(customerResult.error);
  if (!customerResult.data) {
    const error = new Error('Next-of-kin request was not found.');
    error.statusCode = 404;
    throw error;
  }
  const customer = customerResult.data;
  const phone = customer.next_of_kin_phone || '';

  if (customer.next_of_kin_otp_status === 'verified') {
    return { customer, application: null, alreadyVerified: true };
  }

  if (
    !customer.next_of_kin_otp_hash ||
    customer.next_of_kin_otp_hash !== hashOtp(phone, otp) ||
    new Date(customer.next_of_kin_otp_expires_at).getTime() < Date.now()
  ) {
    const invalid = new Error('Invalid or expired next-of-kin OTP.');
    invalid.statusCode = 400;
    throw invalid;
  }

  const verifiedAt = new Date().toISOString();
  const applicationResult = await getSupabase()
    .from('customer_applications')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  if (applicationResult.error) throw mapSupabaseError(applicationResult.error);

  const duplicateNationalId = Boolean(applicationResult.data.duplicate_national_id);
  const automatedReason = duplicateNationalId
    ? 'Automatic screening rejected this application because the national ID already exists.'
    : 'Automatic screening approved this application after next-of-kin OTP verification.';
  const activationOtp = duplicateNationalId ? '' : createOtp();
  const activationExpiresAt = activationOtp ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;
  const smsAction = duplicateNationalId ? 'reject' : 'approve';
  const smsResult = await sendScreeningSms({
    action: smsAction,
    customer,
    agent,
    reason: automatedReason,
    activationOtp
  }).catch((smsError) => ({
    error: smsError.message,
    provider: 'africastalking'
  }));

  if (activationOtp && !activationSmsWasDelivered(smsResult)) {
    const error = new Error('Customer activation OTP could not be sent. Check Africa\'s Talking SMS settings before approving this application.');
    error.statusCode = 502;
    throw error;
  }

  const updateCustomer = await getSupabase()
    .from('customers')
    .update({
      next_of_kin_otp_status: 'verified',
      next_of_kin_otp_verified_at: verifiedAt,
      next_of_kin_verified_at: verifiedAt,
      application_status: duplicateNationalId ? 'rejected' : 'active',
      status: duplicateNationalId ? 'rejected' : 'active',
      screening_reason: automatedReason,
      screened_at: verifiedAt,
      customer_activation_otp_hash: activationOtp ? hashOtp(customer.id, activationOtp) : customer.customer_activation_otp_hash,
      customer_activation_otp_expires_at: activationExpiresAt || customer.customer_activation_otp_expires_at,
      customer_activation_otp_sent_at: activationOtp ? verifiedAt : customer.customer_activation_otp_sent_at,
      customer_activation_otp_status: activationOtp ? 'sent' : customer.customer_activation_otp_status
    })
    .eq('id', customerId)
    .select()
    .single();

  if (updateCustomer.error) throw mapSupabaseError(updateCustomer.error);

  const application = await getSupabase()
    .from('customer_applications')
    .update({
      status: duplicateNationalId ? 'rejected' : 'approved',
      review_reason: automatedReason,
      reviewed_at: verifiedAt
    })
    .eq('customer_id', customerId)
    .select()
    .single();

  if (application.error) throw mapSupabaseError(application.error);

  await createScreeningNotification({
    customer: updateCustomer.data,
    agent,
    duplicateNationalId,
    agentCode: agent.agent_code || agent.agent_id
  });

  return { customer: updateCustomer.data, application: application.data, sms: smsResult };
}

export async function acceptNextOfKinOtp(customerId, body) {
  const otp = String(body.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) {
    const error = new Error('Enter the 6-digit next-of-kin OTP.');
    error.statusCode = 400;
    throw error;
  }

  return completeNextOfKinAcceptance({ customerId, otp, agent: null });
}

export async function verifyNextOfKinOtp(user, customerId, body) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const otp = String(body.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) {
    const error = new Error('Enter the 6-digit next-of-kin OTP.');
    error.statusCode = 400;
    throw error;
  }

  return completeNextOfKinAcceptance({ customerId, otp, agent });
}

export async function createAgentCustomerDepositRequest(user, customerId, body) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const amount = Number(body.amount || 0);
  if (!amount || amount <= 0) {
    const error = new Error('Enter a valid deposit amount.');
    error.statusCode = 400;
    throw error;
  }

  const agentCode = agent.agent_code || agent.agent_id;
  const agentName = agent.full_name || agent.agent_name;
  let customerRequest = getSupabase()
    .from('customers')
    .select('*')
    .eq('id', customerId);

  customerRequest = agentCode ? customerRequest.eq('agent_id', agentCode) : customerRequest.eq('agent_name', agentName);
  const { data: customer, error } = await customerRequest.single();

  if (error) throw mapSupabaseError(error);
  if (customer.status === 'rejected' || customer.application_status === 'rejected') {
    const rejected = new Error('This customer application was rejected and cannot receive a deposit prompt.');
    rejected.statusCode = 409;
    throw rejected;
  }

  const phone = String(body.phone || customer.customer_phone || '').trim();
  if (!phone) {
    const missingPhone = new Error('Enter the customer payment phone number.');
    missingPhone.statusCode = 400;
    throw missingPhone;
  }

  const request = await startCustomerCheckoutRequest(customer, {
    amount,
    phone,
    sourcePortal: 'agent',
    narration: 'Bumu Paygo Deposit'
  });

  await getSupabase()
    .from('agent_notifications')
    .insert({
      agent_id: agent.id,
      agent_code: agentCode,
      agent_name: agentName,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      message: `Deposit prompt for KES ${amount.toLocaleString('en-KE')} was sent to ${phone}.`,
      status: 'queued',
      source_portal: 'agent'
    });

  return { paymentRequest: request };
}

export async function createAgentTask(user, body) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const title = nonEmpty(body.title);
  const note = nonEmpty(body.note);
  if (!title || !note) {
    const error = new Error('Complete required fields: task title, task note.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('agent_tasks')
    .insert({
      agent_id: agent.id,
      customer_id: body.customerId || null,
      title,
      note,
      due_label: body.dueLabel || 'Today',
      status: 'open'
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  return { task: data };
}

export async function completeAgentTask(user, taskId) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('agent_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('agent_id', agent.id)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  return { task: data };
}

export async function createManualPayment(body) {
  const amount = Number(body.depositCredit || body.deposit_credit || 0) + Number(body.paygoPayment || body.paygo_payment || 0);
  const totalPayable = Number(body.totalPayable || body.total_payable || 0);
  const customerName = nonEmpty(body.customerName || body.customer_name);
  const customerPhone = nonEmpty(body.customerPhone || body.customer_phone);
  const productType = nonEmpty(body.productType || body.product_type || body.assetType || body.asset_type);
  const productModel = nonEmpty(body.productModel || body.product_model || body.bikeModel || body.bike_model || body.itemName || body.item_name);
  const agentName = nonEmpty(body.agentName || body.agent_name);
  const agentId = nonEmpty(body.agentId || body.agent_id);
  const serialNumber = nonEmpty(body.serialNumber || body.serial_number || body.chassisNumber || body.chassis_number);

  const missing = [
    ['customer name', customerName],
    ['customer phone', customerPhone],
    ['product type', productType],
    ['product model', productModel],
    ['serial number or chassis number', serialNumber],
    ['agent name', agentName],
    ['agent ID', agentId]
  ].filter(([, value]) => !value).map(([label]) => label);

  if (missing.length > 0 || !Number.isFinite(totalPayable) || totalPayable <= 0 || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error(missing.length > 0
      ? `Complete required fields: ${missing.join(', ')}.`
      : 'Enter valid total payable and payment amount.');
    error.statusCode = 400;
    throw error;
  }

  const record = {
    customer_name: customerName,
    customer_phone: customerPhone,
    product_type: productType,
    product_model: productModel,
    agent_name: agentName,
    agent_id: agentId,
    bike_model: nonEmpty(body.bikeModel || body.bike_model || body.productModel || body.product_model) || null,
    serial_number: serialNumber,
    chassis_number: body.chassisNumber || body.chassis_number || null,
    total_payable: totalPayable,
    paid_amount: Number(body.paidAmount || body.paid_amount || amount),
    balance: Math.max(totalPayable - amount, 0),
    due_date: body.dueDate || body.due_date || null,
    registration_status: body.registrationStatus || body.registration_status || 'registered',
    deposit_credit: Number(body.depositCredit || body.deposit_credit || 0),
    paygo_payment: Number(body.paygoPayment || body.paygo_payment || 0),
    date: body.date || new Date().toISOString(),
    receipt: body.receipt || body.receiptNumber || body.receipt_number || `MAN-${Date.now()}`,
    method: body.method || 'manual',
    status: body.status || 'paid',
    source_portal: body.sourcePortal || body.source_portal || 'finance'
  };

  const { data, error } = await getSupabase()
    .from('payments')
    .insert(record)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
  return { payment: data };
}

export async function listCustomers(query = {}) {
  const request = getSupabase()
    .from('customers')
    .select('*')
    .order('customer_name', { ascending: true });
  const { data, error } = await applyRange(request, query);

  if (error) throw mapSupabaseError(error);
  return { customers: data || [] };
}

export async function listCustomerPaymentRecords(query = {}) {
  let request = getSupabase()
    .from('payments')
    .select('*')
    .order('date', { ascending: false });

  if (query.agentName) request = request.ilike('agent_name', query.agentName);
  if (query.agentId) request = request.ilike('agent_id', query.agentId);

  const { data, error } = await applyRange(request, query);

  if (error) throw mapSupabaseError(error);
  return { payments: data || [] };
}

export async function listCommissions(query = {}) {
  const request = getSupabase()
    .from('commissions')
    .select('*')
    .order('earned_at', { ascending: false });
  let { data, error } = await applyRange(request, query);

  if (error) throw mapSupabaseError(error);

  if ((data || []).length === 0 && normalizeOffset(query.offset) === 0) {
    const payments = await getSupabase()
      .from('payments')
      .select('id,receipt,customer_name,agent_name,agent_id,agent_phone,bike_model,serial_number,chassis_number,product_type,product_model,deposit_credit,date,created_at')
      .order('date', { ascending: false })
      .limit(500);

    if (payments.error) throw mapSupabaseError(payments.error);

    const generated = buildSaleCommissionsFromPayments(payments.data || []);

    if (generated.length > 0) {
      const inserted = await getSupabase()
        .from('commissions')
        .upsert(generated, { onConflict: 'id' })
        .select()
        .order('earned_at', { ascending: false });

      if (inserted.error) throw mapSupabaseError(inserted.error);
      data = inserted.data || generated;
    }
  }

  return { commissions: data || [] };
}

export async function payCommission(id) {
  const { data, error } = await getSupabase()
    .from('commissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw mapSupabaseError(error);
  return queueCommissionPayout(data);
}

export async function markAgentCommissionsPaid(agentKey) {
  const { data, error } = await getSupabase()
    .from('commissions')
    .select('*')
    .or(`agent_code.eq.${agentKey},agent_name.eq.${agentKey}`)
    .not('status', 'in', '(paid,processing)');

  if (error) throw mapSupabaseError(error);

  const queued = [];
  for (const commission of data || []) {
    const result = await queueCommissionPayout(commission, 'FIN-AGENT');
    queued.push(result.commission);
  }

  return { commissions: queued };
}

export async function createAgentNotification(body) {
  let source = body;

  if (body.commissionId || body.commission_id) {
    const commissionId = body.commissionId || body.commission_id;
    const commission = await getSupabase()
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .single();

    if (commission.error) throw mapSupabaseError(commission.error);
    source = {
      ...body,
      agent_name: commission.data.agent_name,
      agent_code: commission.data.agent_code,
      agent_phone: commission.data.agent_phone,
      customer_name: commission.data.customer_name,
      message: body.message || `Follow up ${commission.data.customer_name || 'customer account'}.`
    };
  }

  const record = {
    agent_name: source.agentName || source.agent_name,
    agent_code: source.agentCode || source.agent_code,
    agent_phone: source.agentPhone || source.agent_phone,
    customer_name: source.customerName || source.customer_name,
    message: source.message,
    source_portal: 'finance',
    created_at: source.createdAt || source.created_at || new Date().toISOString()
  };

  const { data, error } = await getSupabase()
    .from('agent_notifications')
    .insert(record)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);

  if (body.commissionId || body.commission_id) {
    await getSupabase()
      .from('commissions')
      .update({ follow_up_sent_at: record.created_at })
      .eq('id', body.commissionId || body.commission_id);
  }

  return { notification: data };
}

export async function listReconciliation(query = {}) {
  const request = getSupabase()
    .from('reconciliation')
    .select('*')
    .order('date', { ascending: false });
  const { data, error } = await applyRange(request, query);

  if (error) throw mapSupabaseError(error);
  return { records: data || [] };
}

export async function listFinanceNotifications(query = {}) {
  const request = getSupabase()
    .from('finance_notifications')
    .select('*')
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false });
  const { data, error } = await applyRange(request, query, 200);

  if (error) throw mapSupabaseError(error);
  return { notifications: data || [] };
}

function daysBetween(dateValue, now = new Date()) {
  if (!dateValue) return 0;
  const today = new Date(`${now.toISOString().slice(0, 10)}T12:00:00.000Z`);
  const target = new Date(`${String(dateValue).slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.floor((today - target) / (24 * 60 * 60 * 1000));
}

function customerReminderAmount(customer) {
  const dailyInstallment = Number(customer.daily_installment || 0);
  const balance = Number(customer.balance || 0);
  if (dailyInstallment > 0 && balance > 0) return Math.min(dailyInstallment, balance);
  return balance;
}

async function hasFinanceNotificationToday(type, customerId, since) {
  const result = await getSupabase()
    .from('finance_notifications')
    .select('id')
    .eq('type', type)
    .eq('customer_id', customerId)
    .gte('created_at', since)
    .limit(1);

  if (result.error) throw mapSupabaseError(result.error);
  return Boolean(result.data?.length);
}

async function insertCustomerNotificationOnce({ customerId, title, message, type, since }) {
  const existing = await getSupabase()
    .from('customer_notifications')
    .select('id')
    .eq('customer_id', customerId)
    .eq('type', type)
    .gte('created_at', since)
    .limit(1);

  if (existing.error) throw mapSupabaseError(existing.error);
  if (existing.data?.length) return null;

  const inserted = await getSupabase()
    .from('customer_notifications')
    .insert({ customer_id: customerId, title, message, type, status: 'unread', source_portal: 'backend' })
    .select()
    .single();

  if (inserted.error) throw mapSupabaseError(inserted.error);
  return inserted.data;
}

async function insertAgentNotificationOnce({ customer, message, since }) {
  const existing = await getSupabase()
    .from('agent_notifications')
    .select('id')
    .eq('agent_code', customer.agent_id || '')
    .eq('customer_name', customer.customer_name || '')
    .eq('message', message)
    .gte('created_at', since)
    .limit(1);

  if (existing.error) throw mapSupabaseError(existing.error);
  if (existing.data?.length) return null;

  const inserted = await getSupabase()
    .from('agent_notifications')
    .insert({
      agent_name: customer.agent_name || null,
      agent_code: customer.agent_id || null,
      customer_name: customer.customer_name,
      message,
      status: 'queued',
      source_portal: 'backend'
    })
    .select()
    .single();

  if (inserted.error) throw mapSupabaseError(inserted.error);
  return inserted.data;
}

async function createFinanceFollowUpNotification({ customer, type, title, message, issue, followUp, severity, amount, overdueDays, since }) {
  if (await hasFinanceNotificationToday(type, customer.id, since)) return null;

  const inserted = await getSupabase()
    .from('finance_notifications')
    .insert({
      type,
      title,
      message,
      issue,
      follow_up: followUp,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      agent_name: customer.agent_name,
      agent_code: customer.agent_id,
      amount,
      balance: Number(customer.balance || 0),
      overdue_days: overdueDays,
      source_portal: 'backend',
      severity,
      status: 'unread'
    })
    .select()
    .single();

  if (inserted.error) throw mapSupabaseError(inserted.error);
  return inserted.data;
}

export async function runAutomatedFollowUps({ dryRun = false } = {}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const since = `${today}T00:00:00.000Z`;
  const stalePaymentCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const staleOtpCutoff = now.toISOString();
  const customers = await getSupabase()
    .from('customers')
    .select('*')
    .in('status', ['active', 'defaulted', 'next_of_kin_pending', 'pending_screening'])
    .limit(1000);

  if (customers.error) throw mapSupabaseError(customers.error);

  const summary = {
    checked: customers.data?.length || 0,
    customerNotifications: 0,
    agentNotifications: 0,
    financeNotifications: 0,
    smsSent: 0,
    smsFailed: 0,
    statusUpdates: 0,
    expiredCustomerOtps: 0,
    expiredNextOfKinOtps: 0,
    stalePaymentRequests: 0,
    dryRun
  };

  if (!dryRun) {
    const [expiredCustomerOtps, expiredNextOfKinOtps, stalePaymentRequests] = await Promise.all([
      getSupabase()
        .from('customers')
        .update({ customer_activation_otp_status: 'expired' })
        .eq('customer_activation_otp_status', 'sent')
        .lt('customer_activation_otp_expires_at', staleOtpCutoff)
        .select('id'),
      getSupabase()
        .from('customers')
        .update({ next_of_kin_otp_status: 'expired' })
        .eq('next_of_kin_otp_status', 'sent')
        .lt('next_of_kin_otp_expires_at', staleOtpCutoff)
        .select('id'),
      getSupabase()
        .from('payment_requests')
        .update({
          status: 'failed',
          failure_reason: 'Payment request expired before provider confirmation.',
          updated_at: now.toISOString()
        })
        .in('status', ['pending', 'processing'])
        .lt('created_at', stalePaymentCutoff)
        .select('id')
    ]);

    [expiredCustomerOtps, expiredNextOfKinOtps, stalePaymentRequests].forEach(({ error }) => {
      if (error) throw mapSupabaseError(error);
    });

    summary.expiredCustomerOtps = expiredCustomerOtps.data?.length || 0;
    summary.expiredNextOfKinOtps = expiredNextOfKinOtps.data?.length || 0;
    summary.stalePaymentRequests = stalePaymentRequests.data?.length || 0;
  }

  for (const customer of customers.data || []) {
    const overdueDays = Math.max(0, daysBetween(customer.due_date, now));
    const dueToday = String(customer.due_date || '').slice(0, 10) === today;
    const balance = Number(customer.balance || 0);
    const amount = customerReminderAmount(customer);

    if (customer.status === 'next_of_kin_pending') {
      const type = 'next_of_kin_pending';
      const message = `${customer.customer_name} is waiting for next-of-kin acceptance.`;
      if (!dryRun) {
        const finance = await createFinanceFollowUpNotification({
          customer,
          type,
          title: 'Next-of-kin acceptance pending',
          message,
          issue: 'Customer onboarding cannot continue until next-of-kin accepts.',
          followUp: 'Agent should contact the next-of-kin and confirm they received the SMS link.',
          severity: 'warning',
          amount: 0,
          overdueDays: 0,
          since
        });
        if (finance) summary.financeNotifications += 1;
        const agent = await insertAgentNotificationOnce({ customer, message, since });
        if (agent) summary.agentNotifications += 1;
      }
      continue;
    }

    if (customer.status === 'pending_screening') {
      const type = 'screening_pending';
      if (!dryRun) {
        const finance = await createFinanceFollowUpNotification({
          customer,
          type,
          title: 'Screening still pending',
          message: `${customer.customer_name} is still pending automatic screening completion.`,
          issue: 'Automatic screening did not complete as expected.',
          followUp: 'Review KYC, next-of-kin acceptance, and SMS delivery status.',
          severity: 'warning',
          amount: 0,
          overdueDays: 0,
          since
        });
        if (finance) summary.financeNotifications += 1;
      }
      continue;
    }

    if (!dryRun && ['active', 'defaulted'].includes(customer.status) && Number(customer.overdue_days || 0) !== overdueDays) {
      const nextStatus = balance <= 0 ? 'paid' : overdueDays >= 3 ? 'defaulted' : customer.status;
      const update = await getSupabase()
        .from('customers')
        .update({ overdue_days: overdueDays, status: nextStatus })
        .eq('id', customer.id);
      if (update.error) throw mapSupabaseError(update.error);
      summary.statusUpdates += 1;
      customer.overdue_days = overdueDays;
      customer.status = nextStatus;
    }

    if (balance <= 0 || (!dueToday && overdueDays <= 0)) continue;

    const notificationType = overdueDays > 0 ? 'payment_overdue' : 'payment_due';
    const title = overdueDays > 0 ? 'Payment overdue' : 'Payment due today';
    const customerMessage = overdueDays > 0
      ? `Your Bumu Paygo payment is ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue. Pay KES ${amount.toLocaleString('en-KE')} to keep your account active.`
      : `Your Bumu Paygo payment of KES ${amount.toLocaleString('en-KE')} is due today.`;
    const agentMessage = overdueDays > 0
      ? `${customer.customer_name} is ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue. Follow up payment of KES ${amount.toLocaleString('en-KE')}.`
      : `${customer.customer_name} has a payment due today. Follow up payment of KES ${amount.toLocaleString('en-KE')}.`;

    if (dryRun) continue;

    const customerNotification = await insertCustomerNotificationOnce({
      customerId: customer.id,
      title,
      message: customerMessage,
      type: notificationType,
      since
    });
    if (customerNotification) summary.customerNotifications += 1;

    const financeNotification = await createFinanceFollowUpNotification({
      customer,
      type: notificationType,
      title,
      message: `${customer.customer_name}: ${customerMessage}`,
      issue: overdueDays > 0 ? 'Customer has missed expected repayment.' : 'Customer has repayment due today.',
      followUp: 'Agent should confirm payment prompt, Paybill payment, or customer support action.',
      severity: overdueDays >= 3 ? 'critical' : overdueDays > 0 ? 'warning' : 'info',
      amount,
      overdueDays,
      since
    });
    if (financeNotification) summary.financeNotifications += 1;

    const agentNotification = await insertAgentNotificationOnce({ customer, message: agentMessage, since });
    if (agentNotification) summary.agentNotifications += 1;

    const [customerSms, agentSms] = await Promise.all([
      sendPaymentReminderSms({ customer, amount, dueDate: customer.due_date, overdueDays }).catch(() => ({ delivered: false })),
      customer.agent_id
        ? getSupabase().from('agents').select('phone').eq('agent_code', customer.agent_id).maybeSingle()
            .then((agentResult) => agentResult.data?.phone
              ? sendAgentFollowUpSms({
                  agentPhone: agentResult.data.phone,
                  customerName: customer.customer_name,
                  customerPhone: customer.customer_phone,
                  overdueDays
                })
              : { delivered: false })
            .catch(() => ({ delivered: false }))
        : Promise.resolve({ delivered: false })
    ]);

    summary.smsSent += [customerSms, agentSms].filter((item) => item?.delivered).length;
    summary.smsFailed += [customerSms, agentSms].filter((item) => item && item.delivered === false).length;
  }

  return summary;
}

export async function getDashboard() {
  const supabase = getSupabase();
  const dashboard = await supabase.rpc('finance_dashboard_summary', { days_back: 30 });

  if (!dashboard.error && dashboard.data) {
    return dashboard.data;
  }

  const [payments, customers, commissions, reconciliation] = await Promise.all([
    supabase.from('payments').select('deposit_credit,paygo_payment,date,status').limit(5000),
    supabase.from('customers').select('total_payable,balance,overdue_days,status').limit(5000),
    supabase.from('commissions').select('amount,status').limit(5000),
    supabase.from('reconciliation').select('status').limit(5000)
  ]);

  [payments, customers, commissions, reconciliation].forEach(({ error }) => {
    if (error) throw mapSupabaseError(error);
  });

  return buildDashboard(payments.data || [], customers.data || [], commissions.data || [], reconciliation.data || []);
}
