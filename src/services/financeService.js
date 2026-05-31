import { apiGet } from './api.js';

export const emptyDashboardSummary = {
  totalCollected: 0,
  expectedAmount: 0,
  overdueAmount: 0,
  activeAccounts: 0,
  todayCollections: 0,
  unpaidPayments: 0,
  pendingCommissions: 0
};

function normalizeDashboardSummary(summary) {
  return {
    totalCollected: summary.totalCollected ?? summary.total_collected ?? 0,
    expectedAmount: summary.expectedAmount ?? summary.expected_amount ?? 0,
    overdueAmount: summary.overdueAmount ?? summary.overdue_amount ?? 0,
    activeAccounts: summary.activeAccounts ?? summary.active_accounts ?? 0,
    todayCollections: summary.todayCollections ?? summary.today_collections ?? 0,
    unpaidPayments: summary.unpaidPayments ?? summary.unpaid_payments ?? 0,
    pendingCommissions: summary.pendingCommissions ?? summary.pending_commissions ?? 0
  };
}

function normalizeReconciliation(record) {
  return {
    id: record.id,
    receipt: record.receipt ?? record.receiptNumber ?? record.receipt_number,
    customerName: record.customerName ?? record.customer_name ?? record.name,
    nationalId: record.nationalId ?? record.national_id ?? record.idNumber ?? record.id_number ?? 'No data yet',
    mpesaAmount: record.mpesaAmount ?? record.mpesa_amount ?? record.amount ?? 0,
    systemAmount: record.systemAmount ?? record.system_amount ?? record.recordedAmount ?? record.recorded_amount,
    date: record.date ?? record.createdAt ?? record.created_at,
    status: record.status
  };
}

export const financeService = {
  async getDashboard() {
    const dashboard = await apiGet('/dashboard');

    return {
      summary: normalizeDashboardSummary(dashboard.summary ?? emptyDashboardSummary),
      trend: dashboard.trend ?? []
    };
  },

  async getReconciliation() {
    const records = await apiGet('/reconciliation');
    return records.map(normalizeReconciliation);
  }
};
