export function isCallbackAuthorized(req, secretNames = ['PAYMENT_CALLBACK_SECRET', 'WEBHOOK_SECRET']) {
  const expected = secretNames.map((name) => process.env[name]).find(Boolean);
  if (!expected) return true;

  const auth = String(req.headers.authorization || '');
  const headerSecret = String(req.headers['x-callback-secret'] || req.headers['x-webhook-secret'] || '');
  const querySecret = new URL(req.url, 'https://local.vercel.app').searchParams.get('secret') || '';

  return auth === `Bearer ${expected}` || headerSecret === expected || querySecret === expected;
}
