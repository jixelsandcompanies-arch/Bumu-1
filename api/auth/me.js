import { handleError, json, methodNotAllowed } from '../_lib/respond.js';
import { requireFinanceUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const user = await requireFinanceUser(req);

    json(res, 200, {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || user.email,
      role: user.app_metadata?.role || user.user_metadata?.role
    });
  } catch (error) {
    handleError(res, error);
  }
}
