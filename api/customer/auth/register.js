import { readJson, sendJson } from '../../_lib/http.js';
import { assertBodySize, assertRateLimit, validateStrongPassword } from '../../_lib/security.js';
import { getSupabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    assertRateLimit(req, { scope: 'customer-register', limit: 5, windowMs: 60_000 });
    const body = await readJson(req);
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const nationalId = String(body.nationalId || '').trim();
    const password = String(body.password || '');

    if (!fullName || !email.includes('@') || !phone || !validateStrongPassword(password)) {
      sendJson(res, 400, { message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.' });
      return;
    }

    let existing = await getSupabase()
      .from('customers')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (existing.error) {
      sendJson(res, 400, { message: existing.error.message || 'Could not check customer profile.' });
      return;
    }

    if (!existing.data) {
      existing = await getSupabase()
        .from('customers')
        .select('*')
        .eq('customer_phone', phone)
        .maybeSingle();

      if (existing.error) {
        sendJson(res, 400, { message: existing.error.message || 'Could not check customer profile.' });
        return;
      }
    }

    let profile;

    if (existing.data?.auth_user_id) {
      sendJson(res, 409, { message: 'This customer profile is already linked to another login.' });
      return;
    }

    const auth = await getSupabase().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: phone || undefined,
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'customer'
      },
      app_metadata: {
        role: 'customer'
      }
    });

    if (auth.error) {
      sendJson(res, 400, { message: auth.error.message || 'Could not create customer account.' });
      return;
    }

    if (existing.data) {
      const linked = await getSupabase()
        .from('customers')
        .update({
          auth_user_id: auth.data.user.id,
          customer_name: existing.data.customer_name || fullName,
          customer_phone: existing.data.customer_phone || phone,
          national_id: existing.data.national_id || nationalId || null,
          email: existing.data.email || email
        })
        .eq('id', existing.data.id)
        .select()
        .single();

      if (linked.error) {
        sendJson(res, 400, { message: linked.error.message || 'Could not link customer profile.' });
        return;
      }

      profile = linked.data;
    } else {
      const inserted = await getSupabase()
        .from('customers')
        .insert({
          auth_user_id: auth.data.user.id,
          customer_name: fullName,
          customer_phone: phone,
          national_id: nationalId || null,
          email,
          product_type: 'product',
          total_payable: 0,
          paid_amount: 0,
          balance: 0,
          status: 'active',
          source_portal: 'customer'
        })
        .select()
        .single();

      if (inserted.error) {
        sendJson(res, 400, { message: inserted.error.message || 'Could not create customer profile.' });
        return;
      }

      profile = inserted.data;
    }

    sendJson(res, 201, {
      user: {
        id: auth.data.user.id,
        email,
        role: 'customer',
        customerId: profile.id,
        fullName
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
