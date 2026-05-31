import { handleError, json, methodNotAllowed } from './_lib/respond.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reconciliation')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    json(res, 200, data ?? []);
  } catch (error) {
    handleError(res, error);
  }
}
