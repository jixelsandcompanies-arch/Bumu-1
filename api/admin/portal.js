import { sendJson } from '../_lib/http.js';
import { getSupabase, requirePortalUser } from '../_lib/supabase.js';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function amount(payment) {
  return Number(payment.deposit_credit || 0) + Number(payment.paygo_payment || 0) || Number(payment.paid_amount || 0);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requirePortalUser(req, ['admin']);
    const today = new Date().toISOString().slice(0, 10);
    const [
      agents,
      customers,
      products,
      payments,
      commissions,
      audits
    ] = await Promise.all([
      getSupabase().from('agents').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('customers').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('inventory_products').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('payments').select('*').order('date', { ascending: false }).limit(100),
      getSupabase().from('commissions').select('*').order('earned_at', { ascending: false }).limit(100),
      getSupabase().from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    [agents, customers, products, payments, commissions, audits].forEach(({ error }) => {
      if (error) throw error;
    });

    const customerRows = customers.data || [];
    const paymentRows = payments.data || [];
    const commissionRows = commissions.data || [];

    sendJson(res, 200, {
      portal: {
        admin: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email,
          role: 'admin'
        },
        summary: {
          agents: (agents.data || []).length,
          customers: customerRows.length,
          activeProducts: (products.data || []).filter((item) => item.status !== 'sold').length,
          totalBalance: customerRows.reduce((total, item) => total + Number(item.balance || 0), 0),
          todayCollections: paymentRows.filter((item) => String(item.date || '').startsWith(today)).reduce((total, item) => total + amount(item), 0),
          pendingCommissions: commissionRows.filter((item) => item.status !== 'paid').reduce((total, item) => total + Number(item.amount || 0), 0)
        },
        agents: (agents.data || []).map((item) => ({
          id: item.id,
          name: item.full_name || item.agent_name || '',
          email: item.email || '',
          phone: item.phone || '',
          region: item.region || '',
          status: item.status || 'active'
        })),
        customers: customerRows.map((item) => ({
          id: item.id,
          name: item.customer_name || '',
          phone: item.customer_phone || '',
          email: item.email || '',
          productType: item.product_type || 'product',
          productModel: item.product_model || item.bike_model || '',
          balance: Number(item.balance || 0),
          status: item.status || 'active'
        })),
        products: (products.data || []).map((item) => ({
          id: item.id,
          productType: item.product_type || 'product',
          productModel: item.product_model || '',
          serialNumber: item.serial_number || '',
          chassisNumber: item.chassis_number || '',
          imei: item.imei || '',
          branch: item.branch || '',
          status: item.status || 'available'
        })),
        payments: paymentRows.map((item) => ({
          id: item.id,
          customerName: item.customer_name || '',
          amount: amount(item),
          receipt: item.receipt || '',
          status: item.status || '',
          date: formatDate(item.date)
        })),
        commissions: commissionRows.map((item) => ({
          id: item.id,
          agentName: item.agent_name || '',
          customerName: item.customer_name || '',
          amount: Number(item.amount || 0),
          status: item.status || ''
        })),
        audits: (audits.data || []).map((item) => ({
          id: item.id,
          actorEmail: item.actor_email || '',
          action: item.action || '',
          targetTable: item.target_table || '',
          targetId: item.target_id || '',
          createdAt: formatDate(item.created_at)
        }))
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
