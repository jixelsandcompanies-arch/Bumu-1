import { getSupabase } from './supabase.js';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapSupabaseError(error) {
  if (!error) return null;
  const mapped = new Error(error.message || 'Database request failed.');
  mapped.statusCode = 500;
  return mapped;
}

function paymentAmount(payment) {
  return Number(payment.deposit_credit || 0) + Number(payment.paygo_payment || 0);
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
        serial_number: payment.serial_number || payment.imei || payment.chassis_number,
        chassis_number: payment.chassis_number || null,
        imei: payment.imei || null,
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

  const updated = await getSupabase()
    .from('commissions')
    .update({
      status: 'processing',
      finance_approved_at: requestedAt,
      finance_approval_reference: approvalReference,
      payout_status: 'queued',
      payout_requested_at: requestedAt,
      payout_reference: payoutRequest.data?.id || null,
      payout_error: null
    })
    .eq('id', commission.id)
    .select()
    .single();

  if (updated.error) throw mapSupabaseError(updated.error);
  return { commission: updated.data, payoutRequest: payoutRequest.data };
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
    bike_model: body.bikeModel || body.bike_model || 'Manual entry',
    serial_number: body.serialNumber || body.serial_number || body.imei || body.chassisNumber || body.chassis_number,
    chassis_number: body.chassisNumber || body.chassis_number || null,
    imei: body.imei || null,
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
      .select('id,receipt,customer_name,agent_name,agent_id,agent_phone,bike_model,serial_number,chassis_number,imei,product_type,product_model,deposit_credit,date,created_at')
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
  const record = {
    agent_name: body.agentName || body.agent_name,
    agent_code: body.agentCode || body.agent_code,
    agent_phone: body.agentPhone || body.agent_phone,
    customer_name: body.customerName || body.customer_name,
    message: body.message,
    source_portal: 'finance',
    created_at: body.createdAt || new Date().toISOString()
  };

  const { data, error } = await getSupabase()
    .from('agent_notifications')
    .insert(record)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);
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
