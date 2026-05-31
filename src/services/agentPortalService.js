import { apiGet } from './api.js';

let lastSyncIssue = null;

function normalizeRegisteredCustomer(customer) {
  return {
    id: customer.id,
    customerName: customer.customerName ?? customer.customer_name ?? customer.name,
    customerPhone: customer.customerPhone ?? customer.customer_phone ?? customer.phone,
    agentName: customer.agentName ?? customer.agent_name,
    agentId: customer.agentId ?? customer.agent_id,
    bikeModel: customer.bikeModel ?? customer.bike_model,
    serialNumber: customer.serialNumber ?? customer.serial_number,
    totalPayable: customer.totalPayable ?? customer.total_payable,
    paidAmount: customer.paidAmount ?? customer.paid_amount,
    balance: customer.balance,
    dueDate: customer.dueDate ?? customer.due_date,
    lastPaymentDate: customer.lastPaymentDate ?? customer.last_payment_date,
    status: customer.status,
    overdueDays: customer.overdueDays ?? customer.overdue_days ?? 0,
    registrationStatus: customer.registrationStatus ?? customer.registration_status ?? customer.status
  };
}

export const agentPortalService = {
  async listRegisteredCustomers() {
    try {
      const customers = await apiGet('/customers');
      lastSyncIssue = null;
      return customers.map(normalizeRegisteredCustomer);
    } catch (error) {
      lastSyncIssue = {
        message: error.message,
        checkedAt: new Date().toISOString()
      };
      throw error;
    }
  },

  async healthCheck() {
    try {
      const health = await apiGet('/health');
      lastSyncIssue = null;
      return health;
    } catch (error) {
      lastSyncIssue = {
        message: error.message,
        checkedAt: new Date().toISOString()
      };
      return { ok: false, mode: 'supabase', error: error.message };
    }
  },

  getLastSyncIssue() {
    return lastSyncIssue;
  }
};
