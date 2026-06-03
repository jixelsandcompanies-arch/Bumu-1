import { backendClient } from './backendClient.js';

let lastSyncIssue = null;

function normalizeRegisteredCustomer(customer) {
  return {
    id: customer.id,
    customerName: customer.customerName ?? customer.customer_name ?? customer.name,
    customerPhone: customer.customerPhone ?? customer.customer_phone ?? customer.phone,
    agentName: customer.agentName ?? customer.agent_name,
    agentId: customer.agentId ?? customer.agent_id,
    productType: customer.productType ?? customer.product_type ?? 'product',
    productModel: customer.productModel ?? customer.product_model ?? customer.bikeModel ?? customer.bike_model,
    bikeModel: customer.bikeModel ?? customer.bike_model ?? customer.productModel ?? customer.product_model,
    chassisNumber: customer.chassisNumber ?? customer.chassis_number ?? '',
    imei: customer.imei ?? '',
    serialNumber: customer.serialNumber ?? customer.serial_number ?? customer.imei ?? customer.chassisNumber ?? customer.chassis_number,
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
      const customers = await backendClient
        .get('/api/customers')
        .then((data) => data.customers ?? data.records ?? data);
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
    return backendClient.get('/api/health').catch((error) => {
      lastSyncIssue = {
        message: error.message,
        checkedAt: new Date().toISOString()
      };
      return { ok: false, mode: 'backend', message: error.message };
    });
  },

  getLastSyncIssue() {
    return lastSyncIssue;
  }
};
