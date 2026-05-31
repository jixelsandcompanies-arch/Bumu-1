import { apiGet, apiPost } from './api.js';

function normalizePaymentStatus(status) {
  return status === 'paid' || status === 'completed' ? 'paid' : 'unpaid';
}

function normalizeBackendPayment(payment) {
  return {
    id: payment.id,
    customerName: payment.customerName ?? payment.customer_name ?? payment.name,
    customerPhone: payment.customerPhone ?? payment.customer_phone ?? payment.phone,
    agentName: payment.agentName ?? payment.agent_name,
    agentId: payment.agentId ?? payment.agent_id ?? payment.agentCode ?? payment.agent_code,
    bikeModel: payment.bikeModel ?? payment.bike_model ?? 'Not registered',
    serialNumber: payment.serialNumber ?? payment.serial_number ?? payment.chassisNumber ?? payment.chassis_number ?? 'Not registered',
    totalPayable: payment.totalPayable ?? payment.total_payable ?? 0,
    paidAmount: payment.paidAmount ?? payment.paid_amount ?? 0,
    balance: payment.balance ?? 0,
    dueDate: payment.dueDate ?? payment.due_date ?? null,
    registrationStatus: payment.registrationStatus ?? payment.registration_status ?? 'registered',
    depositCredit: payment.depositCredit ?? payment.deposit_credit ?? payment.amount ?? 0,
    paygoPayment: payment.paygoPayment ?? payment.paygo_payment ?? 0,
    date: payment.date ?? payment.createdAt ?? payment.created_at,
    receipt: payment.receipt ?? payment.receiptNumber ?? payment.receipt_number,
    status: normalizePaymentStatus(payment.status),
    sourcePortal: payment.sourcePortal ?? payment.source_portal ?? 'Backend database'
  };
}

export const paymentService = {
  async listPayments() {
    const payments = await apiGet('/payments');
    return payments.map(normalizeBackendPayment);
  },

  async saveManualPayment(payment) {
    const record = {
      ...payment,
      syncedToBackend: true
    };

    const data = await apiPost('/payments/manual', record);
    return {
      ...record,
      ...normalizeBackendPayment(data),
      syncedToBackend: true
    };
  }
};
