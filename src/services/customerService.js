import { paymentService } from './paymentService.js';

const agentDirectory = {
  'mary wanjiku': 'bumu-ag-001',
  'peter kariuki': 'bumu-ag-002',
  'grace atieno': 'bumu-ag-003'
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function agentIdFor(payment) {
  return normalize(payment.agentId || agentDirectory[normalize(payment.agentName)]);
}

export const customerService = {
  async listPaymentRecordsByAgent({ agentName, agentId }) {
    const name = normalize(agentName);
    const id = normalize(agentId);

    if (!name || !id) {
      return [];
    }

    const payments = await paymentService.listPayments();
    return payments.filter(
      (payment) => normalize(payment.agentName) === name && agentIdFor(payment) === id
    );
  }
};
