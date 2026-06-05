import { readJson, sendJson } from '../../../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../../../_lib/security.js';
import { getSupabase, requirePortalUser } from '../../../_lib/supabase.js';

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
    await assertRateLimit(req, { scope: 'admin-application-details', limit: 40, windowMs: 60_000 });
    const admin = await requirePortalUser(req, ['admin']);
    const body = await readJson(req);
    const id = req.query?.id || req.url.split('/').slice(-2)[0];

    const current = await getSupabase()
      .from('customer_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (current.error) throw current.error;
    if (!current.data) {
      sendJson(res, 404, { message: 'Customer application not found.' });
      return;
    }

    const update = {};
    if (Object.prototype.hasOwnProperty.call(body, 'verification')) {
      update.verification = body.verification && typeof body.verification === 'object' ? body.verification : {};
    }
    if (Object.prototype.hasOwnProperty.call(body, 'bikeId')) {
      update.product_id = body.bikeId ? String(body.bikeId) : null;
    }

    if (update.product_id) {
      const productCheck = await getSupabase()
        .from('inventory_products')
        .select('*')
        .eq('id', update.product_id)
        .maybeSingle();
      if (productCheck.error) throw productCheck.error;
      if (!productCheck.data) {
        sendJson(res, 404, { message: 'Selected bike was not found.' });
        return;
      }
      if (
        productCheck.data.status === 'sold' ||
        (productCheck.data.assigned_customer_id && productCheck.data.assigned_customer_id !== current.data.customer_id)
      ) {
        sendJson(res, 409, { message: 'This bike is already sold or reserved for another customer.' });
        return;
      }
    }

    const updated = await getSupabase()
      .from('customer_applications')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (updated.error) throw updated.error;

    if (Object.prototype.hasOwnProperty.call(update, 'product_id')) {
      await getSupabase()
        .from('inventory_products')
        .update({ assigned_customer_id: null, status: 'assigned' })
        .eq('assigned_customer_id', current.data.customer_id);

      if (update.product_id) {
        const product = await getSupabase()
          .from('inventory_products')
          .update({ assigned_customer_id: current.data.customer_id, status: 'reserved' })
          .eq('id', update.product_id)
          .select()
          .maybeSingle();
        if (product.error) throw product.error;
      }
    }

    await audit(admin, 'application_details_updated', 'customer_applications', id, {
      fields: Object.keys(update)
    });
    sendJson(res, 200, { application: updated.data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
