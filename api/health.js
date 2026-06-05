import { sendJson } from './_lib/http.js';
import { proxyBackend } from './_lib/backend.js';
import { getSupabase, hasSupabaseAuthConfig, hasSupabaseConfig } from './_lib/supabase.js';
import { hasSmsConfig, smsConfigDiagnostics } from './_lib/twilio.js';

const REQUIRED_TABLES = [
  'admin_profiles',
  'system_settings',
  'admin_audit_logs',
  'agents',
  'customers',
  'customer_applications',
  'inventory_products',
  'payments',
  'commissions',
  'finance_notifications',
  'agent_notifications',
  'api_rate_limits'
];

async function checkTable(supabase, table) {
  const { error } = await supabase.from(table).select('*').limit(1);
  return {
    table,
    ok: !error,
    error: error ? error.message : null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end();
    return;
  }

  if (!process.env.BACKEND_API_URL) {
    if (!hasSupabaseConfig()) {
      sendJson(res, 200, {
        ok: true,
        mode: 'api-ready',
        databaseConfigured: false,
        supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
        supabaseAnonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
        supabaseAuthConfigured: hasSupabaseAuthConfig(),
        supabaseServiceRoleValid: false,
        stateless: true,
        region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'local',
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
        checkedAt: new Date().toISOString()
      });
      return;
    }

    const serviceRoleCheck = await getSupabase().auth.admin.listUsers({ page: 1, perPage: 1 });
    const tableChecks = serviceRoleCheck.error
      ? []
      : await Promise.all(REQUIRED_TABLES.map((table) => checkTable(getSupabase(), table)));

    sendJson(res, 200, {
      ok: !serviceRoleCheck.error && hasSupabaseAuthConfig() && tableChecks.every((check) => check.ok),
      mode: 'supabase',
      databaseConfigured: true,
      supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
      supabaseAnonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
      supabaseAuthConfigured: hasSupabaseAuthConfig(),
      supabaseServiceRoleValid: !serviceRoleCheck.error,
      tableChecks,
      automation: {
        cronSecretConfigured: Boolean(process.env.CRON_SECRET || process.env.FOLLOW_UP_CRON_SECRET),
        paymentCallbackSecretConfigured: Boolean(process.env.PAYMENT_CALLBACK_SECRET || process.env.WEBHOOK_SECRET),
        payoutCallbackSecretConfigured: Boolean(process.env.PAYOUT_CALLBACK_SECRET || process.env.WEBHOOK_SECRET),
        otpPepperConfigured: Boolean(process.env.OTP_PEPPER && process.env.OTP_PEPPER !== 'bumu-paygo'),
        smsConfigured: hasSmsConfig(),
        smsProvider: smsConfigDiagnostics().provider,
        smsConfig: smsConfigDiagnostics(),
        passwordResetOtpProvider: smsConfigDiagnostics().verifyConfigured ? 'twilio_verify' : 'local_or_email',
        passwordResetOtpConfigured: smsConfigDiagnostics().verifyConfigured || Boolean(process.env.RESEND_API_KEY && process.env.OTP_FROM_EMAIL),
        paymentProvider: process.env.PAYMENT_PROVIDER || 'daraja',
        commissionPayoutProvider: process.env.COMMISSION_PAYOUT_PROVIDER || process.env.PAYOUT_PROVIDER || 'daraja'
      },
      error: serviceRoleCheck.error
        ? serviceRoleCheck.error.message
        : !hasSupabaseAuthConfig()
          ? 'SUPABASE_ANON_KEY is missing. Login routes cannot sign users in.'
          : tableChecks.find((check) => !check.ok)?.error || null,
      stateless: true,
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'local',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      checkedAt: new Date().toISOString()
    });
    return;
  }

  await proxyBackend(req, res, '/health');
}
