import { proxyBackend } from './_lib/backend.js';
import { readJson, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.end();
    return;
  }

  const body = await readJson(req);

  if (!process.env.BACKEND_API_URL) {
    sendJson(res, 202, {
      message: 'Agent notification accepted locally. Configure BACKEND_API_URL to deliver it to the agent portal.',
      notification: body
    });
    return;
  }

  await proxyBackend(req, res, '/agent-notifications', { method: 'POST', body });
}
