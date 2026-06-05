import { readJson, sendJson, sendOptions } from '../../_lib/http.js';
import { getSupabase, requirePortalUser } from '../../_lib/supabase.js';

const VALID_SECTIONS = new Set(['admin', 'access', 'security', 'reminders', 'finance', 'messages']);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendOptions(res, 'GET,PUT,OPTIONS');
    return;
  }

  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET,PUT');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requirePortalUser(req, ['admin']);
    const section = String(req.query?.section || '').trim();

    if (!VALID_SECTIONS.has(section)) {
      sendJson(res, 400, { message: 'Choose a valid settings section.' });
      return;
    }

    if (req.method === 'GET') {
      const { data, error } = await getSupabase()
        .from('system_settings')
        .select('section,values,saved_at,updated_at')
        .eq('section', section)
        .maybeSingle();

      if (error) throw error;
      sendJson(res, 200, { setting: data || { section, values: null } });
      return;
    }

    const body = await readJson(req);
    const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
      ? body.values
      : null;

    if (!values) {
      sendJson(res, 400, { message: 'Settings values must be an object.' });
      return;
    }

    const payload = {
      section,
      values,
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.email || null
    };

    const { data, error } = await getSupabase()
      .from('system_settings')
      .upsert(payload, { onConflict: 'section' })
      .select('section,values,saved_at,updated_at,updated_by')
      .single();

    if (error) throw error;
    sendJson(res, 200, { setting: data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
