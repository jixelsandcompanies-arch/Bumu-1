import { backendClient } from './backendClient.js';
import { getDailyTarget, getOverdueDays, getPaymentAmount, getPaymentBalance, getPaygoAccountState, getPaygoFollowUp } from '../utils/paygo.js';

function normalizePaymentStatus(status) {
  return status === 'paid' || status === 'completed' ? 'paid' : 'unpaid';
}

function buildPaymentSearchIndex(payment) {
  return [
    payment.customerName,
    payment.customerPhone,
    payment.agentName,
    payment.agentId,
    payment.receipt,
    payment.providerReference,
    payment.providerTransactionId,
    payment.providerAccountReference,
    payment.providerPayerPhone,
    payment.bikeModel,
    payment.serialNumber,
    payment.chassisNumber,
    payment.status,
    payment.sourcePortal
  ].map((value) => String(value ?? '').toLowerCase()).join(' ');
}

function normalizePayment(payment) {
  const normalizedPayment = {
    id: payment.id,
    customerName: payment.customerName ?? payment.customer_name ?? payment.name,
    customerPhone: payment.customerPhone ?? payment.customer_phone ?? payment.phone,
    agentName: payment.agentName ?? payment.agent_name,
    agentId: payment.agentId ?? payment.agent_id ?? payment.agentCode ?? payment.agent_code,
    bikeModel: payment.bikeModel ?? payment.bike_model ?? payment.productModel ?? payment.product_model ?? '',
    productType: payment.productType ?? payment.product_type ?? 'product',
    productModel: payment.productModel ?? payment.product_model ?? payment.bikeModel ?? payment.bike_model ?? '',
    chassisNumber: payment.chassisNumber ?? payment.chassis_number ?? '',
    serialNumber: payment.serialNumber ?? payment.serial_number ?? payment.chassisNumber ?? payment.chassis_number ?? '',
    totalPayable: payment.totalPayable ?? payment.total_payable ?? 0,
    paidAmount: payment.paidAmount ?? payment.paid_amount ?? getPaymentAmount(payment),
    balance: getPaymentBalance(payment),
    dueDate: payment.dueDate ?? payment.due_date ?? null,
    registrationStatus: payment.registrationStatus ?? payment.registration_status ?? 'registered',
    depositCredit: payment.depositCredit ?? payment.deposit_credit ?? payment.amount ?? 0,
    paygoPayment: payment.paygoPayment ?? payment.paygo_payment ?? 0,
    dailyTarget: getDailyTarget(payment),
    date: payment.date ?? payment.createdAt ?? payment.created_at,
    receipt: payment.receipt ?? payment.receiptNumber ?? payment.receipt_number,
    providerReference: payment.providerReference ?? payment.provider_reference,
    providerTransactionId: payment.providerTransactionId ?? payment.provider_transaction_id,
    providerAccountReference: payment.providerAccountReference ?? payment.provider_account_reference,
    providerPayerPhone: payment.providerPayerPhone ?? payment.provider_payer_phone,
    providerPaidAt: payment.providerPaidAt ?? payment.provider_paid_at,
    status: normalizePaymentStatus(payment.status),
    overdueDays: payment.overdueDays ?? payment.overdue_days ?? getOverdueDays(payment),
    paygoState: payment.paygoState ?? payment.paygo_state ?? getPaygoAccountState(payment),
    followUp: payment.followUp ?? payment.follow_up ?? getPaygoFollowUp(payment),
    sourcePortal: payment.sourcePortal ?? payment.source_portal ?? ''
  };

  return {
    ...normalizedPayment,
    searchIndex: buildPaymentSearchIndex(normalizedPayment)
  };
}

export const paymentService = {
  async listPayments() {
    const payments = await backendClient
      .get('/api/payments')
      .then((data) => data.payments ?? data.records ?? data);

    return payments
      .map(normalizePayment)
      .sort((first, second) => String(second.date || '').localeCompare(String(first.date || '')));
  },

  async saveManualPayment(payment) {
    const data = await backendClient.post('/api/payments/manual', payment);

    return {
      ...payment,
      ...normalizePayment(data.payment ?? data.record ?? data)
    };
  },

  async syncProviderPayments() {
    return [];
  }
};
