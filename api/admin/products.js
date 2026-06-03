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
    assertRateLimit(req, { scope: 'admin-products', limit: 20, windowMs: 60_000 });
    const user = await requirePortalUser(req, ['admin']);
    const body = await readJson(req);
    const productType = String(body.productType || 'product').trim().toLowerCase();
    const productModel = String(body.productModel || '').trim();

    if (!productType || !productModel) {
      sendJson(res, 400, { message: 'Enter product type and model.' });
      return;
    }

    const { data, error } = await getSupabase()
      .from('inventory_products')
      .insert({
        product_type: productType,
        product_model: productModel,
        serial_number: body.serialNumber || null,
        chassis_number: body.chassisNumber || null,
        branch: body.branch || null,
        status: body.status || 'available',
        source_portal: 'admin'
      })
      .select()
      .single();

    if (error) throw error;
    await audit(user, 'product_created', 'inventory_products', data.id, { productType, productModel });
    sendJson(res, 201, { product: data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
