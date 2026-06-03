import { readJson, sendJson } from '../../_lib/http.js';
import { getSupabase } from '../../_lib/supabase.js';

function agentCode(seed = '') {
  const compactDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const stable = String(seed || random).replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'AG';
  return `AG-KE-${compactDate}-${stable}${random}`;
}

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
    const password = String(body.password || '');
    const region = String(body.region || '').trim();
    const nationalId = String(body.nationalId || '').trim();

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
        role: 'agent'
      },
      app_metadata: {
        role: 'agent'
      }
    });

    if (auth.error) {
      sendJson(res, 400, { message: auth.error.message || 'Could not create agent account.' });
      return;
    }

    const code = agentCode(email);
    const { data, error } = await getSupabase()
      .from('agents')
      .insert({
        auth_user_id: auth.data.user.id,
        agent_code: code,
        full_name: fullName,
        national_id: nationalId || null,
        phone,
        email,
        region,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      sendJson(res, 400, { message: error.message || 'Could not create agent profile.' });
      return;
    }

    sendJson(res, 201, {
      user: {
        id: auth.data.user.id,
        email,
        role: 'agent',
        agentId: data.id,
        agentCode: data.agent_code,
        fullName
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
