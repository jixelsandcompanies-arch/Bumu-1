import { completeAgentTask } from '../../../_lib/database.js';
import { sendJson } from '../../../_lib/http.js';
import { requireAuthenticatedUser } from '../../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const id = req.query?.id || req.url.split('/').slice(-2)[0];
    const result = await completeAgentTask(user, decodeURIComponent(id));
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
