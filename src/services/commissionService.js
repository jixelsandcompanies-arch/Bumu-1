import { apiGet } from './api.js';

function normalizeCommission(commission) {
  return {
    id: commission.id,
    agentName: commission.agentName ?? commission.agent_name,
    agentCode: commission.agentCode ?? commission.agent_code ?? commission.agentId ?? commission.agent_id,
    customerName: commission.customerName ?? commission.customer_name,
    type: commission.type,
    amount: commission.amount ?? 0,
    status: commission.status,
    earnedAt: commission.earnedAt ?? commission.earned_at ?? commission.createdAt ?? commission.created_at,
    paidAt: commission.paidAt ?? commission.paid_at
  };
}

export const commissionService = {
  async listCommissions() {
    const commissions = await apiGet('/commissions');
    return commissions.map(normalizeCommission);
  }
};
