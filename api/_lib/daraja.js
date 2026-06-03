const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

function baseUrl() {
  return process.env.MPESA_DARAJA_ENV === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

function hasConsumerConfig() {
  return Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET);
}

export function hasStkConfig() {
  return Boolean(
    hasConsumerConfig() &&
    process.env.MPESA_BUSINESS_SHORT_CODE &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_CALLBACK_URL
  );
}

export function hasB2CConfig() {
  return Boolean(
    hasConsumerConfig() &&
    process.env.MPESA_B2C_SHORTCODE &&
    process.env.MPESA_INITIATOR_NAME &&
    process.env.MPESA_SECURITY_CREDENTIAL &&
    process.env.MPESA_B2C_RESULT_URL &&
    process.env.MPESA_B2C_TIMEOUT_URL
  );
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

async function accessToken() {
  if (!hasConsumerConfig()) {
    const error = new Error('Daraja consumer credentials are not configured.');
    error.statusCode = 501;
    throw error;
  }

  const credentials = Buffer
    .from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`)
    .toString('base64');
  const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    const error = new Error(data.errorMessage || data.error || 'Could not authenticate with Daraja.');
    error.statusCode = 502;
    throw error;
  }

  return data.access_token;
}

export async function initiateStkPush({ amount, phone, accountReference, transactionDescription }) {
  if (!hasStkConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const token = await accessToken();
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
  const time = timestamp();
  const password = Buffer.from(`${shortCode}${process.env.MPESA_PASSKEY}${time}`).toString('base64');
  const body = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: time,
    TransactionType: process.env.MPESA_STK_TRANSACTION_TYPE || 'CustomerPayBillOnline',
    Amount: Math.trunc(Number(amount)),
    PartyA: normalizePhone(phone),
    PartyB: shortCode,
    PhoneNumber: normalizePhone(phone),
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: String(accountReference || 'BUMU-PAYGO').slice(0, 32),
    TransactionDesc: String(transactionDescription || 'Bumu Paygo payment').slice(0, 100)
  };
  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ResponseCode !== '0') {
    const error = new Error(data.errorMessage || data.ResponseDescription || 'Daraja STK request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    status: 'processing',
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    providerResponse: data
  };
}

export async function initiateB2CPayout({ amount, phone, remarks, occasion }) {
  if (!hasB2CConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const token = await accessToken();
  const body = {
    InitiatorName: process.env.MPESA_INITIATOR_NAME,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    CommandID: process.env.MPESA_B2C_COMMAND_ID || 'BusinessPayment',
    Amount: Math.trunc(Number(amount)),
    PartyA: process.env.MPESA_B2C_SHORTCODE,
    PartyB: normalizePhone(phone),
    Remarks: String(remarks || 'Bumu Paygo payout').slice(0, 100),
    QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL,
    ResultURL: process.env.MPESA_B2C_RESULT_URL,
    Occasion: String(occasion || 'Commission payout').slice(0, 100)
  };
  const response = await fetch(`${baseUrl()}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ResponseCode !== '0') {
    const error = new Error(data.errorMessage || data.ResponseDescription || 'Daraja B2C request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    status: 'processing',
    conversationId: data.ConversationID,
    originatorConversationId: data.OriginatorConversationID,
    providerResponse: data
  };
}
