import { readJson, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJson(req);

    if (!process.env.BACKEND_API_URL) {
      sendJson(res, 501, {
        message: 'Password reset OTP must be sent by the secure backend.'
      });
      return;
    }

    const response = await fetch(`${process.env.BACKEND_API_URL}/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));

    sendJson(res, response.status, data);
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}
