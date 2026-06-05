const PAYMENTS_LIVE_URL = 'https://payments.africastalking.com';
const PAYMENTS_SANDBOX_URL = 'https://payments.sandbox.africastalking.com';

function envValue(name) {
  return String(process.env[name] || '').trim();
}

function username() {
  return envValue('AFRICASTALKING_USERNAME') || envValue('AFRICAS_TALKING_USERNAME');
}

function apiKey() {
  return envValue('AFRICASTALKING_API_KEY') || envValue('AFRICAS_TALKING_API_KEY');
}

function productName() {
  return envValue('AFRICASTALKING_PAYMENT_PRODUCT') || envValue('AFRICAS_TALKING_PAYMENT_PRODUCT');
}

function providerChannel() {
  return envValue('AFRICASTALKING_PAYMENT_PROVIDER_CHANNEL') || envValue('AFRICAS_TALKING_PAYMENT_PROVIDER_CHANNEL');
}

function currencyCode() {
  return envValue('AFRICASTALKING_PAYMENT_CURRENCY') || 'KES';
}

function useSandbox() {
  return ['1', 'true', 'yes', 'sandbox'].includes(
    String(envValue('AFRICASTALKING_PAYMENTS_SANDBOX') || envValue('AFRICASTALKING_SANDBOX')).toLowerCase()
  ) || username() === 'sandbox';
}

function baseUrl() {
  return useSandbox() ? PAYMENTS_SANDBOX_URL : PAYMENTS_LIVE_URL;
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return String(phone || '').trim().startsWith('+') ? String(phone).trim() : `+${digits}`;
}

export function hasAfricasTalkingPaymentConfig() {
  return Boolean(username() && apiKey() && productName());
}

export function africasTalkingPaymentDiagnostics() {
  return {
    configured: hasAfricasTalkingPaymentConfig(),
    usernameConfigured: Boolean(username()),
    apiKeyConfigured: Boolean(apiKey()),
    productConfigured: Boolean(productName()),
    providerChannelConfigured: Boolean(providerChannel()),
    currencyCode: currencyCode(),
    sandbox: useSandbox()
  };
}

async function paymentRequest(path, payload) {
  if (!hasAfricasTalkingPaymentConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: {
      apikey: apiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.errorMessage || data.description || 'Africa\'s Talking payment request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return { configured: true, data };
}

function checkoutAccepted(data) {
  const status = String(data.status || '').toLowerCase();
  return ['pending', 'success', 'queued', 'submitted'].includes(status) || Boolean(data.transactionId);
}

export async function initiateStkPush({ amount, phone, accountReference, transactionDescription }) {
  if (!hasAfricasTalkingPaymentConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const payload = {
    username: username(),
    productName: productName(),
    phoneNumber: normalizePhone(phone),
    currencyCode: currencyCode(),
    amount: Math.trunc(Number(amount)),
    metadata: {
      accountReference: String(accountReference || ''),
      transactionDescription: String(transactionDescription || 'Bumu Paygo payment')
    }
  };

  if (providerChannel()) payload.providerChannel = providerChannel();

  const result = await paymentRequest('/mobile/checkout/request', payload);
  const data = result.data || {};

  if (!checkoutAccepted(data)) {
    const error = new Error(data.description || data.message || 'Africa\'s Talking mobile checkout request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    status: 'processing',
    checkoutRequestId: data.transactionId || data.id || null,
    merchantRequestId: data.providerChannel || providerChannel() || null,
    transactionId: data.transactionId || null,
    providerResponse: data
  };
}

function payoutEntryStatus(entry) {
  const status = String(entry?.status || '').toLowerCase();
  if (status === 'success' || status === 'completed') return 'paid';
  if (status === 'failed' || status === 'rejected') return 'failed';
  return 'processing';
}

export async function initiateB2CPayout({ amount, phone, remarks, occasion }) {
  if (!hasAfricasTalkingPaymentConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const recipient = {
    phoneNumber: normalizePhone(phone),
    currencyCode: currencyCode(),
    amount: Math.trunc(Number(amount)),
    reason: envValue('AFRICASTALKING_B2C_REASON') || 'BusinessPayment',
    name: String(occasion || 'Commission payout').slice(0, 100),
    metadata: {
      remarks: String(remarks || 'Bumu Paygo payout'),
      occasion: String(occasion || 'Commission payout')
    }
  };

  if (providerChannel()) recipient.providerChannel = providerChannel();

  const result = await paymentRequest('/mobile/b2c/request', {
    username: username(),
    productName: productName(),
    recipients: [recipient]
  });
  const data = result.data || {};
  const entry = Array.isArray(data.entries) ? data.entries[0] : null;

  if (!entry?.transactionId) {
    const error = new Error(data.description || data.message || 'Africa\'s Talking B2C request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    status: payoutEntryStatus(entry),
    conversationId: entry.transactionId,
    originatorConversationId: entry.transactionId,
    providerResponse: data
  };
}
