import { handleError, json, methodNotAllowed } from './_lib/respond.js';
import { getSupabase, requireFinanceUser } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    await requireFinanceUser(req);
    const supabase = getSupabase();
    const { error } = await supabase.from('customers').select('id').limit(1);

    if (error) throw error;

    json(res, 200, { ok: true, mode: 'vercel_api_supabase' });
  } catch (error) {
    handleError(res, error);
  }
}
