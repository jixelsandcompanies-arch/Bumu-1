import { sendJson } from '../_lib/http.js';
import { getSupabase, requirePortalUser } from '../_lib/supabase.js';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function amount(payment) {
  return Number(payment.deposit_credit || 0) + Number(payment.paygo_payment || 0) || Number(payment.paid_amount || 0);
}

function parseStorageReference(reference) {
  const value = String(reference || '');
  if (!value.startsWith('storage://')) return null;
  const withoutScheme = value.slice('storage://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex <= 0) return null;
  return {
    bucket: withoutScheme.slice(0, slashIndex),
    path: withoutScheme.slice(slashIndex + 1)
  };
}

async function signedDocumentUrl(reference) {
  const parsed = parseStorageReference(reference);
  if (!parsed) return reference || '';

  const signed = await getSupabase()
    .storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 60 * 10);

  if (signed.error) return '';
  return signed.data.signedUrl || '';
}

async function buildApplicationDocuments(customer = {}) {
  const entries = [
    ['Customer passport', customer.passport_photo_url],
    ['Customer ID front', customer.id_front_url],
    ['Customer ID back', customer.id_back_url],
    ['Next-of-kin passport/copy', customer.next_of_kin_passport_photo_url],
    ['Next-of-kin ID front', customer.next_of_kin_id_front_url],
    ['Next-of-kin ID back', customer.next_of_kin_id_back_url]
  ];

  return Promise.all(entries.map(async ([label, reference]) => ({
    label,
    url: await signedDocumentUrl(reference)
  }))).then((items) => items.filter((item) => item.url));
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
      applications,
      audits,
      financeAuthUsers,
      financeNotifications,
      agentNotifications
    ] = await Promise.all([
      getSupabase().from('agents').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('customers').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('inventory_products').select('*').order('created_at', { ascending: false }).limit(200),
      getSupabase().from('payments').select('*').order('date', { ascending: false }).limit(100),
      getSupabase().from('commissions').select('*').order('earned_at', { ascending: false }).limit(100),
      getSupabase().from('customer_applications').select('*, customers(*)').order('created_at', { ascending: false }).limit(100),
      getSupabase().from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      getSupabase().auth.admin.listUsers({ page: 1, perPage: 200 }),
      getSupabase().from('finance_notifications').select('*').order('created_at', { ascending: false }).limit(100),
      getSupabase().from('agent_notifications').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    [agents, customers, products, payments, commissions, applications, audits, financeNotifications, agentNotifications].forEach(({ error }) => {
      if (error) throw error;
    });
    if (financeAuthUsers.error) throw financeAuthUsers.error;

    const customerRows = customers.data || [];
    const paymentRows = payments.data || [];
    const commissionRows = commissions.data || [];

    const applicationRows = await Promise.all((applications.data || []).map(async (item) => {
      const assignedProduct = (products.data || []).find((product) => product.assigned_customer_id === item.customer_id);
      return {
        id: item.id,
        customerId: item.customer_id,
        customerName: item.customers?.customer_name || '',
        phone: item.customers?.customer_phone || '',
        nationalId: item.national_id || item.customers?.national_id || '',
        agentName: item.agent_name || '',
        agentId: item.agent_id || '',
        bikeId: item.product_id || assignedProduct?.id || '',
        productType: item.customers?.product_type || 'product',
        productModel: item.customers?.product_model || item.customers?.bike_model || '',
        depositAmount: Number(item.customers?.paid_amount || 0),
        installmentPlan: item.customers?.daily_installment
          ? `Daily KES ${Number(item.customers.daily_installment || 0).toLocaleString('en-KE')}`
          : 'Daily repayment',
        nextOfKin: item.customers?.next_of_kin_name || '',
        nextOfKinPhone: item.customers?.next_of_kin_phone || '',
        nextOfKinNationalId: item.customers?.next_of_kin_national_id || '',
        nextOfKinGender: item.customers?.next_of_kin_gender || '',
        nextOfKinLocation: item.customers?.next_of_kin_location || '',
        nextOfKinOccupation: item.customers?.next_of_kin_occupation || '',
        customerOtpVerified: item.customers?.customer_activation_otp_status === 'verified',
        nextOfKinOtpVerified: item.customers?.next_of_kin_otp_status === 'verified',
        duplicateNationalId: Boolean(item.duplicate_national_id),
        documents: await buildApplicationDocuments(item.customers),
        verification: item.verification || {},
        status: item.status || 'pending_screening',
        reason: item.review_reason || '',
        reviewedAt: item.reviewed_at || '',
        reviewedBy: item.reviewed_by || '',
        submittedAt: item.created_at || '',
        createdAt: formatDate(item.created_at)
      };
    }));

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
          pendingApplications: (applications.data || []).filter((item) => item.status === 'pending_screening').length,
          activeProducts: (products.data || []).filter((item) => item.status !== 'sold').length,
          totalBalance: customerRows.reduce((total, item) => total + Number(item.balance || 0), 0),
          todayCollections: paymentRows.filter((item) => String(item.date || '').startsWith(today)).reduce((total, item) => total + amount(item), 0),
          pendingCommissions: commissionRows.filter((item) => item.status !== 'paid').reduce((total, item) => total + Number(item.amount || 0), 0)
        },
        agents: (agents.data || []).map((item) => ({
          id: item.id,
          agentCode: item.agent_code || '',
          name: item.full_name || item.agent_name || '',
          nationalId: item.national_id || '',
          email: item.email || '',
          phone: item.phone || '',
          region: item.region || '',
          role: 'field_agent',
          status: item.status || 'active',
          totalCustomers: customerRows.filter((customer) => customer.agent_id === item.agent_code).length,
          commissionBalance: commissionRows
            .filter((commission) => commission.agent_code === item.agent_code && commission.status !== 'paid')
            .reduce((total, commission) => total + Number(commission.amount || 0), 0)
        })),
        customers: customerRows.map((item) => ({
          id: item.id,
          name: item.customer_name || '',
          nationalId: item.national_id || '',
          phone: item.customer_phone || '',
          email: item.email || '',
          dateOfBirth: item.date_of_birth || '',
          gender: item.gender || '',
          location: item.location || '',
          occupation: item.occupation || '',
          agentId: item.agent_id || '',
          agentName: item.agent_name || '',
          productType: item.product_type || 'product',
          productModel: item.product_model || item.bike_model || '',
          balance: Number(item.balance || 0),
          applicationStatus: item.application_status || item.status || 'active',
          repaymentStatus: item.status || 'active',
          status: item.status || 'active',
          createdAt: item.created_at || ''
        })),
        products: (products.data || []).map((item) => ({
          id: item.id,
          productType: item.product_type || 'product',
          productModel: item.product_model || '',
          serialNumber: item.serial_number || '',
          chassisNumber: item.chassis_number || '',
          branch: item.branch || '',
          status: item.status || 'available',
          assignedCustomerId: item.assigned_customer_id || null,
          assignedAgentId: item.assigned_agent_id || null,
          assignedAgentCode: item.assigned_agent_code || null,
          createdAt: item.created_at || ''
        })),
        payments: paymentRows.map((item) => ({
          id: item.id,
          customerId: item.customer_id || '',
          agentId: item.agent_id || '',
          customerName: item.customer_name || '',
          amount: amount(item),
          receipt: item.receipt || '',
          status: item.status || '',
          reconciliationStatus: item.reconciliation_status || 'matched',
          paidAt: item.paid_at || item.date || '',
          date: formatDate(item.date)
        })),
        commissions: commissionRows.map((item) => ({
          id: item.id,
          agentName: item.agent_name || '',
          customerName: item.customer_name || '',
          amount: Number(item.amount || 0),
          status: item.status || ''
        })),
        financeUsers: (financeAuthUsers.data?.users || [])
          .filter((item) => ['admin', 'finance', 'agent', 'customer'].includes(item.app_metadata?.role || item.user_metadata?.role))
          .map((item) => ({
            id: item.id,
            email: item.email || '',
            name: item.user_metadata?.full_name || item.email || '',
            phone: item.user_metadata?.phone || '',
            role: item.app_metadata?.display_role || item.user_metadata?.display_role || item.app_metadata?.role || item.user_metadata?.role || 'finance_officer',
            status: item.app_metadata?.status || item.user_metadata?.status || 'pending',
            createdAt: formatDate(item.created_at)
          })),
        applications: applicationRows,
        notifications: [
          ...(financeNotifications.data || []).map((item) => ({
            id: item.id,
            title: item.title || item.type || 'Finance notification',
            message: item.message || '',
            channel: item.channel || 'in_app',
            status: item.status === 'read' ? 'read' : 'unread',
            createdAt: item.created_at || '',
            priority: item.severity || 'normal'
          })),
          ...(agentNotifications.data || []).map((item) => ({
            id: item.id,
            title: item.customer_name ? `Agent follow-up: ${item.customer_name}` : 'Agent notification',
            message: item.message || '',
            channel: 'sms',
            status: item.status === 'read' ? 'read' : 'unread',
            createdAt: item.created_at || '',
            priority: 'normal'
          }))
        ],
        audits: (audits.data || []).map((item) => ({
          id: item.id,
          actorEmail: item.actor_email || '',
          action: item.action || '',
          targetTable: item.target_table || '',
          targetId: item.target_id || '',
          createdAt: item.created_at || '',
          ipAddress: item.details?.ipAddress || ''
        }))
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
