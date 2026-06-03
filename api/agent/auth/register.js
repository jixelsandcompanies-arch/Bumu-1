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

    const existing = await getSupabase()
      .from('agents')
      .select('*')
      .or(`email.ilike.${email},phone.eq.${phone}`)
      .maybeSingle();

    if (existing.error) {
      sendJson(res, 400, { message: existing.error.message || 'Could not check agent profile.' });
      return;
    }

    let profile;

    if (existing.data) {
      if (existing.data.auth_user_id && existing.data.auth_user_id !== auth.data.user.id) {
        sendJson(res, 409, { message: 'This agent profile is already linked to another login.' });
        return;
      }

      const linked = await getSupabase()
        .from('agents')
        .update({
          auth_user_id: auth.data.user.id,
          full_name: existing.data.full_name || fullName,
          national_id: existing.data.national_id || nationalId || null,
          phone: existing.data.phone || phone,
          email: existing.data.email || email,
          region: existing.data.region || region,
          status: existing.data.status || 'active'
        })
        .eq('id', existing.data.id)
        .select()
        .single();

      if (linked.error) {
        sendJson(res, 400, { message: linked.error.message || 'Could not link agent profile.' });
        return;
      }

      profile = linked.data;
    } else {
      const code = agentCode(email);
      const inserted = await getSupabase()
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

      if (inserted.error) {
        sendJson(res, 400, { message: inserted.error.message || 'Could not create agent profile.' });
        return;
      }

      profile = inserted.data;
    }

    sendJson(res, 201, {
      user: {
        id: auth.data.user.id,
        email,
        role: 'agent',
        agentId: profile.id,
        agentCode: profile.agent_code,
        fullName
      }
    });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
