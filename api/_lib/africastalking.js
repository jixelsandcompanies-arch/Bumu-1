const LIVE_SMS_URL = 'https://api.africastalking.com/version1/messaging';
const SANDBOX_SMS_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const CHECKOUT_URL = 'https://payments.africastalking.com/mobile/checkout/request';

function isSandbox() {
  return process.env.AFRICASTALKING_ENV !== 'production';
}

export function hasAfricaSmsConfig() {
  return Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
}

export function hasAfricaPaymentsConfig() {
  return Boolean(
    process.env.AFRICASTALKING_USERNAME &&
    process.env.AFRICASTALKING_API_KEY &&
    process.env.AFRICASTALKING_PAYMENT_PRODUCT_NAME &&
    process.env.AFRICASTALKING_PAYMENT_PROVIDER_CHANNEL
  );
}

export function normalizeKenyaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

function formBody(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params;
}

async function africaRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      apiKey: process.env.AFRICASTALKING_API_KEY
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.errorMessage || data.message || 'Africa\'s Talking request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return data;
}

export async function sendSms({ to, message }) {
  if (!hasAfricaSmsConfig()) {
    return { configured: false, delivered: false, provider: 'africastalking' };
  }

  const phone = normalizeKenyaPhone(to);
  if (!phone) {
    return { configured: true, delivered: false, provider: 'africastalking', reason: 'missing_phone' };
  }

  const data = await africaRequest(isSandbox() ? SANDBOX_SMS_URL : LIVE_SMS_URL, formBody({
    username: process.env.AFRICASTALKING_USERNAME,
    to: phone,
    message,
    from: process.env.AFRICASTALKING_SENDER_ID || undefined
  }));

  return { configured: true, delivered: true, provider: 'africastalking', response: data };
}

export async function sendOtpSms({ phone, otp }) {
  return sendSms({
    to: phone,
    message: `Your Bumu Paygo verification code is ${otp}. Valid for 10 minutes. Do not share this code.`
  });
}

export async function sendScreeningSms({ action, customer, agent, reason, tempPassword }) {
  const customerName = customer?.customer_name || 'Customer';
  const customerId = customer?.id || '';
  const customerPhone = customer?.customer_phone || '';
  const agentPhone = agent?.phone || '';

  if (action === 'approve') {
    const customerMessage = tempPassword
      ? `Congratulations ${customerName}! Your Bumu Paygo application has been approved. Login at app.bumupaygo.co.ke with Phone: ${customerPhone} and Password: ${tempPassword}. Change your password on first login.`
      : `Congratulations ${customerName}! Your Bumu Paygo application has been approved. Login at app.bumupaygo.co.ke or contact Bumu Paygo support for account access.`;

    const [customerResult, agentResult] = await Promise.all([
      sendSms({ to: customerPhone, message: customerMessage }),
      sendSms({
        to: agentPhone,
        message: `Good news! Your customer ${customerName} (Ref: ${customerId}) has been approved. They can now log in and start making payments.`
      })
    ]);

    return { customer: customerResult, agent: agentResult };
  }

  if (action === 'reject') {
    return {
      agent: await sendSms({
        to: agentPhone,
        message: `Application for ${customerName} (Ref: ${customerId}) has been rejected. Reason: ${reason || 'Not specified'}. Contact admin for more details.`
      })
    };
  }

  return {
    agent: await sendSms({
      to: agentPhone,
      message: `Action required for ${customerName} (Ref: ${customerId}). Admin needs: ${reason || 'more information'}. Please update the application and resubmit.`
    })
  };
}

export async function sendPaymentConfirmedSms({ customer, amount, receipt, balance, repaymentPct }) {
  return sendSms({
    to: customer?.customer_phone,
    message: `Payment confirmed! KES ${Number(amount || 0).toLocaleString('en-KE')} received for your Bumu Paygo account. M-Pesa Ref: ${receipt || 'pending'}. New balance: KES ${Number(balance || 0).toLocaleString('en-KE')}. Progress: ${Math.round(Number(repaymentPct || 0))}% paid.`
  });
}

export async function sendCommissionPaidSms({ commission }) {
  return sendSms({
    to: commission?.agent_phone,
    message: `Your commission of KES ${Number(commission?.amount || 0).toLocaleString('en-KE')} for customer ${commission?.customer_name || 'customer'} has been processed. Ref: ${commission?.id || commission?.payout_reference || 'commission'}. Check your Bumu Paygo portal for details.`
  });
}

export async function initiateAfricaCheckout({ amount, phone, customerId, customerBikeId, narration }) {
  if (!hasAfricaPaymentsConfig()) {
    return { configured: false, status: 'queued', providerResponse: null };
  }

  const data = await africaRequest(CHECKOUT_URL, formBody({
    username: process.env.AFRICASTALKING_USERNAME,
    productName: process.env.AFRICASTALKING_PAYMENT_PRODUCT_NAME,
    phoneNumber: normalizeKenyaPhone(phone),
    currencyCode: 'KES',
    amount: Math.trunc(Number(amount)),
    providerChannel: process.env.AFRICASTALKING_PAYMENT_PROVIDER_CHANNEL,
    metadata: JSON.stringify({
      customerId,
      customerBikeId: customerBikeId || customerId,
      narration: narration || 'Bumu Paygo Installment'
    })
  }));

  const transactionId = data.transactionId || data.checkoutRequestId || data.id || null;
  return {
    configured: true,
    status: 'processing',
    transactionId,
    providerResponse: data
  };
}
