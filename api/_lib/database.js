import crypto from 'node:crypto';
import { initiateAfricaCheckout, sendOtpSms } from './africastalking.js';
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

function hashOtp(identifier, otp) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(identifier)}:${otp}:${process.env.OTP_PEPPER || 'bumu-paygo'}`)
    .digest('hex');
}

function createOtp() {
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
    const daraja = await initiateB2CPayout({
      amount: payoutRecord.amount,
      phone: payoutRecord.agent_phone,
      remarks: `Commission ${commission.id}`,
      occasion: approvalReference
    });
    payoutStatus = daraja.status;
    providerResponse = daraja.providerResponse || {};
    backendReference = daraja.conversationId || daraja.originatorConversationId || null;
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
      status: payoutStatus === 'failed' ? 'failed' : 'processing',
      finance_approved_at: requestedAt,
      finance_approval_reference: approvalReference,
      payout_status: payoutStatus,
      payout_requested_at: requestedAt,
      payout_reference: backendReference || payoutRequest.data?.id || null,
      provider_response: providerResponse,
      payout_error: payoutError
    })
    .eq('id', commission.id)
    .select()
    .single();

  if (updated.error) throw mapSupabaseError(updated.error);
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

  const { data, error } = await getSupabase()
    .from('payment_requests')
    .insert({
      customer_id: customer.id,
      amount,
      phone,
      status: 'pending',
      source_portal: 'customer'
    })
    .select()
    .single();

  if (error) throw mapSupabaseError(error);

  let request = data;

  try {
    const useAfricaTalking = process.env.MPESA_PROVIDER === 'africastalking' || process.env.PAYMENT_PROVIDER === 'africastalking';
    const provider = useAfricaTalking
      ? await initiateAfricaCheckout({
          amount,
          phone,
          customerId: customer.id,
          customerBikeId: customer.serial_number || customer.chassis_number || customer.id,
          narration: 'Bumu Paygo Installment'
        })
      : await initiateStkPush({
          amount,
          phone,
          accountReference: customer.id,
          transactionDescription: `Bumu Paygo ${customer.customer_name}`
        });
    const updated = await getSupabase()
      .from('payment_requests')
      .update({
        status: provider.status,
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
      name: agentName || '',
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

  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  if (!customerName || !customerPhone) {
    const error = new Error('Enter customer name and phone number.');
    error.statusCode = 400;
    throw error;
  }

  const totalPayable = Number(body.totalPayable || 0);
  const paidAmount = Number(body.paidAmount || 0);
  const agentCode = agent.agent_code || agent.agent_id;
  const productType = body.productType || 'product';
  const productModel = body.productModel || body.bikeModel || null;
  const nationalId = String(body.nationalId || '').trim();
  const nextOfKinPhone = String(body.nextOfKinPhone || body.next_of_kin_phone || '').trim();
  const nextOfKinOtp = nextOfKinPhone ? createOtp() : '';
  const nextOfKinOtpExpiresAt = nextOfKinOtp ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;
  const nextOfKinOtpDelivery = nextOfKinOtp
    ? await sendOtpSms({ phone: nextOfKinPhone, otp: nextOfKinOtp }).catch((error) => ({
        configured: true,
        delivered: false,
        provider: 'africastalking',
        error: error.message
      }))
    : { configured: false, delivered: false, provider: 'africastalking' };

  if (nextOfKinOtp && !nextOfKinOtpDelivery.delivered) {
    const error = new Error('Next-of-kin OTP could not be sent. Check Africa\'s Talking SMS settings before submitting this application.');
    error.statusCode = 502;
    throw error;
  }
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
      national_id: nationalId || null,
      email: normalizeEmail(body.email) || null,
      date_of_birth: body.dateOfBirth || body.date_of_birth || null,
      gender: body.gender || null,
      location: body.location || null,
      occupation: body.occupation || null,
      passport_photo_url: body.passportPhotoUrl || body.passport_photo_url || null,
      id_front_url: body.idFrontUrl || body.id_front_url || null,
      id_back_url: body.idBackUrl || body.id_back_url || null,
      next_of_kin_name: body.nextOfKinName || body.next_of_kin_name || null,
      next_of_kin_phone: nextOfKinPhone || null,
      next_of_kin_relationship: body.nextOfKinRelationship || body.next_of_kin_relationship || null,
      next_of_kin_passport_photo_url: body.nextOfKinPassportPhotoUrl || body.next_of_kin_passport_photo_url || null,
      next_of_kin_id_front_url: body.nextOfKinIdFrontUrl || body.next_of_kin_id_front_url || null,
      next_of_kin_id_back_url: body.nextOfKinIdBackUrl || body.next_of_kin_id_back_url || null,
      next_of_kin_otp_hash: nextOfKinOtp ? hashOtp(nextOfKinPhone, nextOfKinOtp) : null,
      next_of_kin_otp_expires_at: nextOfKinOtpExpiresAt,
      next_of_kin_otp_sent_at: nextOfKinOtp ? new Date().toISOString() : null,
      next_of_kin_otp_status: nextOfKinOtpDelivery.delivered ? 'sent' : 'not_sent',
      product_type: productType,
      product_model: productModel,
      bike_model: productType === 'bike' ? productModel : null,
      serial_number: body.serialNumber || body.chassisNumber || null,
      chassis_number: body.chassisNumber || null,
      agent_name: agent.full_name || agent.agent_name,
      agent_id: agentCode,
      total_payable: totalPayable,
      paid_amount: paidAmount,
      balance: Math.max(totalPayable - paidAmount, 0),
      due_date: body.dueDate || null,
      daily_installment: Number(body.dailyInstallment || 0),
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

  if (!nextOfKinOtp) {
    await createScreeningNotification({ customer: data, agent, duplicateNationalId, agentCode });
  }

  return { customer: data, nextOfKinOtpRequired: Boolean(nextOfKinOtp), otpDelivery: nextOfKinOtpDelivery };
}

async function createScreeningNotification({ customer, agent, duplicateNationalId, agentCode }) {
  await getSupabase()
    .from('finance_notifications')
    .insert({
      type: duplicateNationalId ? 'screening_duplicate' : 'screening_pending',
      title: duplicateNationalId ? 'Duplicate national ID flagged' : 'Customer screening required',
      message: `${customer.customer_name} was submitted by ${agent.full_name || agent.agent_name || 'agent'} for screening.`,
      issue: duplicateNationalId ? 'National ID already exists in customer records.' : 'Review KYC details and approve, reject, or request more information.',
      follow_up: 'Open Admin portal screening queue.',
      customer_id: customer.id,
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      agent_name: agent.full_name || agent.agent_name,
      agent_code: agentCode,
      severity: duplicateNationalId ? 'critical' : 'info',
      source_portal: 'agent'
    });
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

  const customerResult = await getSupabase()
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('agent_id', agent.agent_code || agent.agent_id)
    .single();

  if (customerResult.error) throw mapSupabaseError(customerResult.error);
  const customer = customerResult.data;
  const phone = customer.next_of_kin_phone || '';

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
  const updateCustomer = await getSupabase()
    .from('customers')
    .update({
      next_of_kin_otp_status: 'verified',
      next_of_kin_otp_verified_at: verifiedAt,
      next_of_kin_verified_at: verifiedAt,
      application_status: 'pending_screening',
      status: 'pending_screening'
    })
    .eq('id', customerId)
    .select()
    .single();

  if (updateCustomer.error) throw mapSupabaseError(updateCustomer.error);

  const application = await getSupabase()
    .from('customer_applications')
    .update({ status: 'pending_screening' })
    .eq('customer_id', customerId)
    .select()
    .single();

  if (application.error) throw mapSupabaseError(application.error);

  await createScreeningNotification({
    customer: updateCustomer.data,
    agent,
    duplicateNationalId: Boolean(application.data.duplicate_national_id),
    agentCode: agent.agent_code || agent.agent_id
  });

  return { customer: updateCustomer.data, application: application.data };
}

export async function createAgentTask(user, body) {
  const agent = await findAgentForAuthUser(user);
  if (!agent) {
    const error = new Error('Agent profile is not connected yet.');
    error.statusCode = 403;
    throw error;
  }

  const { data, error } = await getSupabase()
    .from('agent_tasks')
    .insert({
      agent_id: agent.id,
      customer_id: body.customerId || null,
      title: body.title || 'Follow up customer',
      note: body.note || '',
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
  const record = {
    customer_name: body.customerName || body.customer_name,
    customer_phone: body.customerPhone || body.customer_phone,
    product_type: body.productType || body.product_type || body.assetType || body.asset_type || 'product',
    product_model: body.productModel || body.product_model || body.bikeModel || body.bike_model || body.itemName || body.item_name || null,
    agent_name: body.agentName || body.agent_name,
    agent_id: body.agentId || body.agent_id,
    bike_model: body.bikeModel || body.bike_model || body.productModel || body.product_model || null,
    serial_number: body.serialNumber || body.serial_number || body.chassisNumber || body.chassis_number,
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
