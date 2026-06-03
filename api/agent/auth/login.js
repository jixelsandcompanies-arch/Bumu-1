import { findAgentForAuthUser } from '../../_lib/database.js';
import { sendJson, readJson } from '../../_lib/http.js';
import { getSupabaseAuth } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email.includes('@') || password.length < 8) {
      sendJson(res, 400, { message: 'Enter your registered agent email and password.' });
      return;
    }

    const { data, error } = await getSupabaseAuth().auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) {
      sendJson(res, 401, { message: 'Invalid agent login credentials.' });
      return;
    }

    const role = data.user.app_metadata?.role || data.user.user_metadata?.role || 'agent';
    if (role !== 'agent' && role !== 'admin') {
      sendJson(res, 403, { message: 'Agent portal access is required.' });
      return;
    }

    const agent = await findAgentForAuthUser(data.user);
    if (!agent) {
      sendJson(res, 403, { message: 'Agent profile is not connected yet. Ask admin to approve or link this email.' });
      return;
    }

    sendJson(res, 200, {
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: 'agent',
        agentId: agent.id,
        agentCode: agent.agent_code,
        fullName: agent.full_name
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
