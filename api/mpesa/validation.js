import { isCallbackAuthorized } from '../_lib/callbackAuth.js';
import { readJson, sendJson } from '../_lib/http.js';
import { getSupabase } from '../_lib/supabase.js';

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return `+${digits}`;
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { ResultCode: 1, ResultDesc: 'Method not allowed.' });
    return;
  }

  try {
    if (!isCallbackAuthorized(req)) {
      sendJson(res, 401, { ResultCode: 1, ResultDesc: 'Unauthorized callback.' });
      return;
    }

    const body = await readJson(req);
    const accountReference = String(body.BillRefNumber || body.AccountReference || '').trim();
    const payerPhone = normalizePhone(body.MSISDN || body.phone);

    let request = getSupabase().from('customers').select('id').limit(1);
    if (accountReference) {
      const filters = [
        `national_id.eq.${accountReference}`,
        `customer_phone.eq.${accountReference}`
      ];
      if (looksLikeUuid(accountReference)) filters.unshift(`id.eq.${accountReference}`);
      request = request.or(filters.join(','));
    } else if (payerPhone) {
      request = request.eq('customer_phone', payerPhone);
    } else {
      sendJson(res, 200, { ResultCode: 1, ResultDesc: 'Missing account reference or phone.' });
      return;
    }

    const result = await request.maybeSingle();
    if (result.error || !result.data) {
      sendJson(res, 200, { ResultCode: 1, ResultDesc: 'Customer account not found.' });
      return;
    }

    sendJson(res, 200, { ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    sendJson(res, 500, { ResultCode: 1, ResultDesc: error.message });
  }
}
