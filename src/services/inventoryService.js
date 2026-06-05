import { backendClient } from './backendClient.js';

function normalizeProduct(product) {
  return {
    id: product.id,
    productType: product.productType ?? product.product_type ?? 'product',
    productModel: product.productModel ?? product.product_model ?? product.model ?? '',
    serialNumber: product.serialNumber ?? product.serial_number ?? '',
    chassisNumber: product.chassisNumber ?? product.chassis_number ?? '',
    branch: product.branch ?? '',
    status: product.status ?? 'available',
    assignedCustomerId: product.assignedCustomerId ?? product.assigned_customer_id ?? null,
    assignedAgentId: product.assignedAgentId ?? product.assigned_agent_id ?? null,
    assignedAgentCode: product.assignedAgentCode ?? product.assigned_agent_code ?? null,
    createdAt: product.createdAt ?? product.created_at ?? ''
  };
}

export const inventoryService = {
  async listProducts() {
    const data = await backendClient.get('/api/inventory');
    const products = data.products ?? data.records ?? data;
    return Array.isArray(products) ? products.map(normalizeProduct) : [];
  }
};
