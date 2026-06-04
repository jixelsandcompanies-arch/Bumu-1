import { readJson, sendJson } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { getSupabase, requirePortalUser } from '../_lib/supabase.js';

async function audit(user, action, targetTable, targetId, details = {}) {
  await getSupabase().from('admin_audit_logs').insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action,
    target_table: targetTable,
    target_id: targetId,
    details
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    await assertRateLimit(req, { scope: 'admin-customers', limit: 20, windowMs: 60_000 });
    const user = await requirePortalUser(req, ['admin']);
    const body = await readJson(req);
    const customerName = String(body.customerName || '').trim();
    const customerPhone = String(body.customerPhone || '').trim();

    if (!customerName || !customerPhone) {
      sendJson(res, 400, { message: 'Enter customer name and phone.' });
      return;
    }

    const totalPayable = Number(body.totalPayable || 0);
    const paidAmount = Number(body.paidAmount || 0);
    const productType = body.productType || 'product';
    const productModel = body.productModel || null;

    const { data, error } = await getSupabase()
      .from('customers')
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        email: String(body.email || '').trim().toLowerCase() || null,
        national_id: body.nationalId || null,
        date_of_birth: body.dateOfBirth || body.date_of_birth || null,
        gender: body.gender || null,
        location: body.location || null,
        occupation: body.occupation || null,
        next_of_kin_name: body.nextOfKinName || body.next_of_kin_name || null,
        next_of_kin_phone: body.nextOfKinPhone || body.next_of_kin_phone || null,
        next_of_kin_relationship: body.nextOfKinRelationship || body.next_of_kin_relationship || null,
        product_type: productType,
        product_model: productModel,
        bike_model: productType === 'bike' ? productModel : null,
        serial_number: body.serialNumber || body.chassisNumber || null,
        chassis_number: body.chassisNumber || null,
        total_payable: totalPayable,
        paid_amount: paidAmount,
        balance: Math.max(totalPayable - paidAmount, 0),
        daily_installment: Number(body.dailyInstallment || 0),
        application_status: 'active',
        status: 'active',
        source_portal: 'admin'
      })
      .select()
      .single();

    if (error) throw error;
    await audit(user, 'customer_created', 'customers', data.id, { customerName, productType });
    sendJson(res, 201, { customer: data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
