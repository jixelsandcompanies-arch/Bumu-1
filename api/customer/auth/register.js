import { readJson, sendJson } from '../../_lib/http.js';
import { getSupabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJson(req);
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const nationalId = String(body.nationalId || '').trim();
    const password = String(body.password || '');

    if (!fullName || !email.includes('@') || !phone || password.length < 8) {
      sendJson(res, 400, { message: 'Enter name, email, phone, and a password with at least 8 characters.' });
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

    const { data, error } = await getSupabase()
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

    if (error) {
      sendJson(res, 400, { message: error.message || 'Could not create customer profile.' });
      return;
    }

    sendJson(res, 201, {
      user: {
        id: auth.data.user.id,
        email,
        role: 'customer',
        customerId: data.id,
        fullName
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
