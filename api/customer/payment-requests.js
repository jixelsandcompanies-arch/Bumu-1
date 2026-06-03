import { createCustomerPaymentRequest } from '../_lib/database.js';
import { sendJson, readJson } from '../_lib/http.js';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const body = await readJson(req);
    const result = await createCustomerPaymentRequest(user, body);
    sendJson(res, 201, result);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
