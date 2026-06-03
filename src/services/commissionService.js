import { backendClient } from './backendClient.js';
import { listLocalCommissions, markLocalAgentCommissionsPaid, updateLocalCommission } from './localData.js';
import { paymentService } from './paymentService.js';
import { buildMonthlyPaygoCommissions } from '../utils/commission.js';

function normalizeCommission(commission) {
  return {
    id: commission.id,
    agentName: commission.agentName ?? commission.agent_name,
    agentCode: commission.agentCode ?? commission.agent_code ?? commission.agentId ?? commission.agent_id,
    agentPhone: commission.agentPhone ?? commission.agent_phone ?? commission.phone,
    customerName: commission.customerName ?? commission.customer_name,
    productType: commission.productType ?? commission.product_type ?? commission.assetType ?? commission.asset_type ?? 'product',
    productModel: commission.productModel ?? commission.product_model ?? commission.bikeModel ?? commission.bike_model ?? commission.itemName ?? commission.item_name ?? 'Product',
    chassisNumber: commission.chassisNumber ?? commission.chassis_number ?? '',
    imei: commission.imei ?? '',
    serialNumber: commission.serialNumber ?? commission.serial_number ?? commission.imei ?? commission.chassisNumber ?? commission.chassis_number ?? '',
    type: commission.type,
    amount: commission.amount ?? 0,
    status: commission.status,
    earnedAt: commission.earnedAt ?? commission.earned_at ?? commission.createdAt ?? commission.created_at,
    paidAt: commission.paidAt ?? commission.paid_at,
    payoutStatus: commission.payoutStatus ?? commission.payout_status,
    payoutRequestedAt: commission.payoutRequestedAt ?? commission.payout_requested_at,
    payoutReference: commission.payoutReference ?? commission.payout_reference,
    payoutError: commission.payoutError ?? commission.payout_error,
    approvalReference: commission.approvalReference ?? commission.finance_approval_reference ?? commission.payoutReference ?? commission.payout_reference,
    approvedAt: commission.approvedAt ?? commission.finance_approved_at ?? commission.paidAt ?? commission.paid_at,
    paymentPercentage: commission.paymentPercentage ?? commission.payment_percentage ?? 0,
    commissionRate: commission.commissionRate ?? commission.commission_rate ?? 0,
    notificationMessage: commission.notificationMessage ?? commission.notification_message ?? '',
    payoutNote: commission.payoutNote ?? commission.payout_note ?? 'earned after sale and activation',
    earnedMonth: commission.earnedMonth ?? commission.earned_month ?? String(commission.earnedAt ?? '').slice(0, 7),
    customerPaymentStatus: commission.customerPaymentStatus ?? commission.customer_payment_status ?? commission.paymentStatus ?? commission.payment_status ?? 'unpaid',
    followUpSentAt: commission.followUpSentAt ?? commission.follow_up_sent_at
  };
}

function storeLocalAgentNotification(notification) {
  const key = 'bumu-agent-follow-up-notifications';
  const current = JSON.parse(window.localStorage.getItem(key) || '[]');
  const next = [{ ...notification, id: `AGENT-NOT-${Date.now()}` }, ...current];

  window.localStorage.setItem(key, JSON.stringify(next));
  return next[0];
}

export const commissionService = {
  async listCommissions() {
    let commissions = listLocalCommissions();

    if (backendClient.isConfigured) {
      commissions = await backendClient
        .get('/api/commissions')
        .then((data) => data.commissions ?? data.records ?? data)
        .catch(() => commissions);

      if (Array.isArray(commissions) && commissions.length === 0) {
        const payments = await paymentService.listPayments().catch(() => []);
        commissions = buildMonthlyPaygoCommissions(payments);
      }
    }

    return commissions.map(normalizeCommission);
  },

  async payAgent(commissionId) {
    if (backendClient.isConfigured) {
      const data = await backendClient.post(`/api/commissions/${commissionId}/pay`, {});
      return normalizeCommission(data.commission ?? data.record ?? data);
    }

    const commission = normalizeCommission(
      listLocalCommissions().find((item) => item.id === commissionId) || {}
    );

    if (!commission.id) {
      throw new Error('Commission not found.');
    }

    if (commission.status === 'paid') {
      return commission;
    }

    return normalizeCommission(updateLocalCommission(commissionId, {
      status: 'processing',
      approvalReference: `FIN-${Date.now()}`,
      payoutStatus: 'queued',
      payoutRequestedAt: new Date().toISOString(),
      payoutError: ''
    }));
  },

  async sendFollowUpNotification(commissionId) {
    const commission = normalizeCommission(
      listLocalCommissions().find((item) => item.id === commissionId) || {}
    );

    if (!commission.id) {
      throw new Error('Commission not found.');
    }

    const notification = {
      agentName: commission.agentName,
      agentCode: commission.agentCode,
      agentPhone: commission.agentPhone,
      customerName: commission.customerName,
      paymentPercentage: commission.paymentPercentage,
      customerPaymentStatus: commission.customerPaymentStatus,
      message: `Follow up ${commission.customerName}. Customer payment is overdue or below commission threshold.`,
      createdAt: new Date().toISOString()
    };

    if (backendClient.isConfigured) {
      await backendClient.post('/api/agent-notifications', notification).catch(() => {
        storeLocalAgentNotification(notification);
      });
    } else {
      storeLocalAgentNotification(notification);
    }

    return normalizeCommission(updateLocalCommission(commissionId, {
      followUpSentAt: notification.createdAt
    }));
  },

  async markAgentPaid(agentKey) {
    if (backendClient.isConfigured) {
      const data = await backendClient.post('/api/commissions/agent-payment-approvals', { agentKey });

      if (data?.commissions || data?.records) {
        return (data.commissions ?? data.records).map(normalizeCommission);
      }
    }

    return markLocalAgentCommissionsPaid(agentKey)
      .map((commission) => normalizeCommission({
        ...commission,
        status: commission.status === 'paid' ? 'paid' : 'processing',
        payoutStatus: commission.status === 'paid' ? 'paid' : 'queued'
      }));
  }
};
