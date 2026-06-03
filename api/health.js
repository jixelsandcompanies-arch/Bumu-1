import { sendJson } from './_lib/http.js';
import { proxyBackend } from './_lib/backend.js';
import { hasSupabaseConfig } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end();
    return;
  }

  if (!process.env.BACKEND_API_URL && !hasSupabaseConfig()) {
    sendJson(res, 200, {
      ok: true,
      mode: 'api-ready',
      databaseConfigured: false,
      stateless: true,
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'local',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      checkedAt: new Date().toISOString()
    });
    return;
  }

  await proxyBackend(req, res, '/health');
}
