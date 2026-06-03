import { getLocalDashboard, getLocalReconciliation } from './localData.js';
import { backendClient } from './backendClient.js';

export const emptyDashboardSummary = {
  totalCollected: 0,
  expectedAmount: 0,
  expectedCollection: 0,
  pendingPayments: 0,
  overdueAmount: 0,
  reconciliationFlags: 0,
  unpaidCommissions: 0,
  activeAccounts: 0,
  todayCollections: 0,
  unpaidPayments: 0,
  pendingCommissions: 0
};

function normalizeDashboardSummary(summary) {
  const expectedAmount = summary.expectedAmount ?? summary.expected_amount ?? 0;
  const pendingCommissions = summary.pendingCommissions ?? summary.pending_commissions ?? 0;

  return {
    totalCollected: summary.totalCollected ?? summary.total_collected ?? 0,
    expectedAmount,
    expectedCollection: summary.expectedCollection ?? summary.expected_collection ?? expectedAmount,
    pendingPayments: summary.pendingPayments ?? summary.pending_payments ?? summary.pendingPaymentAmount ?? summary.pending_payment_amount ?? 0,
    overdueAmount: summary.overdueAmount ?? summary.overdue_amount ?? 0,
    reconciliationFlags: summary.reconciliationFlags ?? summary.reconciliation_flags ?? summary.reconciliationFlagCount ?? summary.reconciliation_flag_count ?? 0,
    unpaidCommissions: summary.unpaidCommissions ?? summary.unpaid_commissions ?? summary.unpaidCommissionAmount ?? summary.unpaid_commission_amount ?? 0,
    activeAccounts: summary.activeAccounts ?? summary.active_accounts ?? 0,
    todayCollections: summary.todayCollections ?? summary.today_collections ?? 0,
    unpaidPayments: summary.unpaidPayments ?? summary.unpaid_payments ?? 0,
    pendingCommissions
  };
}

function normalizeReconciliation(record) {
  return {
    id: record.id,
    receipt: record.receipt ?? record.receiptNumber ?? record.receipt_number,
    customerName: record.customerName ?? record.customer_name ?? record.name,
    nationalId: record.nationalId ?? record.national_id ?? record.idNumber ?? record.id_number ?? 'No data yet',
    providerAmount: record.providerAmount ?? record.provider_amount ?? record.amount ?? 0,
    systemAmount: record.systemAmount ?? record.system_amount ?? record.recordedAmount ?? record.recorded_amount,
    date: record.date ?? record.createdAt ?? record.created_at,
    status: record.status
  };
}

function transactionAmount(record) {
  return Number(
    record.amount ??
    record.totalAmount ??
    record.total_amount ??
    Number(record.depositCredit ?? record.deposit_credit ?? 0) + Number(record.paygoPayment ?? record.paygo_payment ?? 0)
  );
}

function normalizeCollectionTrend(dashboard) {
  const existingTrend = dashboard.trend ?? dashboard.collectionsTrend ?? dashboard.collections_trend;

  if (Array.isArray(existingTrend) && existingTrend.length > 0) {
    return existingTrend.map((item) => ({
      date: item.date ?? item.paymentDate ?? item.payment_date ?? item.createdAt ?? item.created_at,
      amount: Number(item.amount ?? item.collected ?? item.totalCollected ?? item.total_collected ?? 0),
      records: Number(item.records ?? item.recordCount ?? item.record_count ?? 0),
      customers: item.customers ?? item.customerNames ?? item.customer_names ?? [],
      accounts: item.accounts ?? item.accountNames ?? item.account_names ?? []
    }));
  }

  const transactions = dashboard.transactions ??
    dashboard.paymentTransactions ??
    dashboard.payment_transactions ??
    dashboard.collectionTransactions ??
    dashboard.collection_transactions ??
    [];

  if (!Array.isArray(transactions)) {
    return [];
  }

  const daily = transactions.reduce((days, transaction) => {
    const date = String(transaction.date ?? transaction.paymentDate ?? transaction.payment_date ?? transaction.createdAt ?? transaction.created_at ?? '').slice(0, 10);
    if (!date) return days;

    const current = days.get(date) ?? {
      date,
      amount: 0,
      records: 0,
      customers: new Set(),
      accounts: new Set()
    };

    current.amount += transactionAmount(transaction);
    current.records += 1;
    if (transaction.customerName || transaction.customer_name) {
      current.customers.add(transaction.customerName ?? transaction.customer_name);
    }
    if (transaction.accountName || transaction.account_name || transaction.accountNumber || transaction.account_number) {
      current.accounts.add(transaction.accountName ?? transaction.account_name ?? transaction.accountNumber ?? transaction.account_number);
    }
    days.set(date, current);
    return days;
  }, new Map());

  return [...daily.values()]
    .sort((first, second) => first.date.localeCompare(second.date))
    .map((item) => ({
      ...item,
      customers: [...item.customers],
      accounts: [...item.accounts]
    }));
}

export const financeService = {
  async getDashboard() {
    const dashboard = await backendClient.get('/api/dashboard').catch(() => getLocalDashboard());

    return {
      summary: normalizeDashboardSummary(dashboard.summary ?? emptyDashboardSummary),
      trend: normalizeCollectionTrend(dashboard)
    };
  },

  async getReconciliation() {
    const data = backendClient.isConfigured
      ? await backendClient.get('/api/reconciliation').catch(() => ({ records: getLocalReconciliation() }))
      : { records: getLocalReconciliation() };
    const records = data.reconciliation ?? data.records ?? data;

    return records.map(normalizeReconciliation);
  }
};
