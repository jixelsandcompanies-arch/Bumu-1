import { backendClient } from './backendClient.js';
import { formatKes } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';

function normalizeNotification(record) {
  const amount = record.amount ?? record.paymentAmount ?? record.payment_amount;
  const balance = record.balance ?? record.outstandingBalance ?? record.outstanding_balance;

  return {
    id: record.id,
    type: record.type ?? 'payment_unpaid',
    title: record.title ?? 'Payment alert',
    message: record.message ?? 'Review the payment record.',
    issue: record.issue,
    followUp: record.followUp ?? record.follow_up,
    customerName: record.customerName ?? record.customer_name,
    customerPhone: record.customerPhone ?? record.customer_phone,
    agentName: record.agentName ?? record.agent_name,
    agentCode: record.agentCode ?? record.agent_code,
    paymentDate: record.paymentDate
      ? formatDate(record.paymentDate)
      : record.payment_date ? formatDate(record.payment_date) : '',
    amount: amount !== undefined && amount !== null ? formatKes(amount) : null,
    balance: balance !== undefined && balance !== null ? formatKes(balance) : null,
    overdueDays: record.overdueDays ?? record.overdue_days,
    sourcePortal: record.sourcePortal ?? record.source_portal ?? 'Backend',
    createdAt: record.createdAt ?? record.created_at ?? new Date().toISOString(),
    isRead: record.status === 'read' || Boolean(record.isRead ?? record.is_read)
  };
}

export const notificationService = {
  async listNotifications() {
    const data = await backendClient
      .get('/api/notifications')
      .catch(() => ({ notifications: [] }));
    const records = data.notifications ?? data.records ?? data;

    return Array.isArray(records) ? records.map(normalizeNotification) : [];
  }
};
