const AFRICAS_TALKING_LIVE_URL = 'https://api.africastalking.com/version1/messaging';
const AFRICAS_TALKING_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

function envValue(name) {
  return String(process.env[name] || '').trim();
}

function maskValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}...`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function username() {
  return envValue('AFRICASTALKING_USERNAME') || envValue('AFRICAS_TALKING_USERNAME');
}

function apiKey() {
  return envValue('AFRICASTALKING_API_KEY') || envValue('AFRICAS_TALKING_API_KEY');
}

function senderId() {
  return envValue('AFRICASTALKING_SENDER_ID') || envValue('AFRICAS_TALKING_SENDER_ID');
}

function useSandbox() {
  return ['1', 'true', 'yes', 'sandbox'].includes(
    String(envValue('AFRICASTALKING_SANDBOX') || envValue('AFRICAS_TALKING_SANDBOX')).toLowerCase()
  ) || username() === 'sandbox';
}

export function africasTalkingConfigDiagnostics() {
  return {
    username: maskValue(username()),
    usernameConfigured: Boolean(username()),
    apiKeyConfigured: Boolean(apiKey()),
    apiKeyLength: apiKey().length,
    senderId: maskValue(senderId()),
    senderIdConfigured: Boolean(senderId()),
    sandbox: useSandbox(),
    configured: hasAfricasTalkingSmsConfig()
  };
}

export function smsConfigDiagnostics() {
  return {
    provider: 'africastalking',
    configured: hasAfricasTalkingSmsConfig(),
    verifyConfigured: false,
    africasTalking: africasTalkingConfigDiagnostics()
  };
}

export function hasAfricasTalkingSmsConfig() {
  return Boolean(username() && apiKey());
}

export function hasSmsConfig() {
  return hasAfricasTalkingSmsConfig();
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return String(phone || '').trim().startsWith('+') ? String(phone).trim() : `+${digits}`;
}

function publicAppBaseUrl() {
  const configured = String(process.env.PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
  if (!configured) return 'https://www.bumupay.com';
  return configured.startsWith('http') ? configured : `https://${configured}`;
}

function portalUrl(portal) {
  const baseUrl = publicAppBaseUrl();
  const key = String(portal || '').toLowerCase();
  if (key === 'agent') return `${baseUrl}/#/agent`;
  if (key === 'customer') return `${baseUrl}/#/customer`;
  if (key === 'admin') return `${baseUrl}/#/admin`;
  return `${baseUrl}/#/login`;
}

function deliveryFromResponse(data) {
  const recipients = data?.SMSMessageData?.Recipients || [];
  if (!Array.isArray(recipients) || recipients.length === 0) return false;
  return recipients.some((item) => {
    const status = String(item.status || '').toLowerCase();
    const statusCode = Number(item.statusCode || 0);
    return status === 'success' || statusCode === 101 || statusCode === 102;
  });
}

export async function sendSms({ to, message }) {
  if (!hasAfricasTalkingSmsConfig()) {
    return { configured: false, delivered: false, provider: 'africastalking' };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return { configured: true, delivered: false, provider: 'africastalking', reason: 'missing_phone' };
  }

  const body = new URLSearchParams({
    username: username(),
    to: phone,
    message: String(message || '')
  });

  if (senderId()) body.set('from', senderId());

  const response = await fetch(useSandbox() ? AFRICAS_TALKING_SANDBOX_URL : AFRICAS_TALKING_LIVE_URL, {
    method: 'POST',
    headers: {
      apikey: apiKey(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.errorMessage || 'Africa\'s Talking SMS request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    delivered: deliveryFromResponse(data),
    provider: 'africastalking',
    response: data,
    sid: data?.SMSMessageData?.Recipients?.[0]?.messageId || null
  };
}

export async function getSmsStatus() {
  return null;
}

export async function sendOtpSms({ phone, otp }) {
  return sendSms({
    to: phone,
    message: `Your Bumu Paygo verification code is ${otp}. Valid for 10 minutes. Do not share this code.`
  });
}

export async function sendNextOfKinAcceptanceSms({ phone, otp, customerName, acceptUrl }) {
  const actionText = acceptUrl
    ? `Accept here: ${acceptUrl}`
    : `Reply 1/YES to accept, or give OTP ${otp} to the agent.`;
  return sendSms({
    to: phone,
    message: acceptUrl
      ? `Bumu Paygo request: ${customerName || 'A customer'} has named you as next-of-kin. ${actionText}. This link expires in 10 minutes.`
      : `Bumu Paygo request: ${customerName || 'A customer'} has named you as next-of-kin. ${actionText} OTP ${otp}. Valid for 10 minutes.`
  });
}

export async function sendScreeningSms({ action, customer, agent, reason, activationOtp }) {
  const customerName = customer?.customer_name || 'Customer';
  const customerId = customer?.id || '';
  const customerPhone = customer?.customer_phone || '';
  const agentPhone = agent?.phone || '';

  if (action === 'approve') {
    const customerMessage = activationOtp
      ? `Congratulations ${customerName}! Your Bumu Paygo account has been approved. Open ${portalUrl('customer')} and enter OTP ${activationOtp} to activate your account and log in. Valid for 10 minutes.`
      : `Congratulations ${customerName}! Your Bumu Paygo account has been approved and activated. You can now log in at ${portalUrl('customer')}.`;

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

export async function sendPaymentReminderSms({ customer, amount, dueDate, overdueDays }) {
  const overdue = Number(overdueDays || 0);
  const message = overdue > 0
    ? `Bumu Paygo reminder: your payment is ${overdue} day${overdue === 1 ? '' : 's'} overdue. Pay KES ${Number(amount || 0).toLocaleString('en-KE')} through your customer portal to keep your account active.`
    : `Bumu Paygo reminder: your payment of KES ${Number(amount || 0).toLocaleString('en-KE')} is due${dueDate ? ` on ${dueDate}` : ''}. Pay through your customer portal to keep your account active.`;

  return sendSms({
    to: customer?.customer_phone,
    message
  });
}

export async function sendAgentFollowUpSms({ agentPhone, customerName, customerPhone, overdueDays }) {
  return sendSms({
    to: agentPhone,
    message: `Bumu Paygo follow-up: ${customerName || 'Customer'} (${customerPhone || 'no phone'}) needs payment follow-up${Number(overdueDays || 0) > 0 ? `, ${overdueDays} days overdue` : ''}. Check your agent portal.`
  });
}

export async function sendAccountApprovedSms({ phone, name, portal }) {
  const portalName = portal || 'portal';
  return sendSms({
    to: phone,
    message: `Hello ${name || 'there'}, your Bumu Paygo ${portalName} account has been approved and activated by admin. You can now log in at ${portalUrl(portalName)}.`
  });
}

export async function sendCommissionPaidSms({ commission }) {
  return sendSms({
    to: commission?.agent_phone,
    message: `Your commission of KES ${Number(commission?.amount || 0).toLocaleString('en-KE')} for customer ${commission?.customer_name || 'customer'} has been processed. Ref: ${commission?.id || commission?.payout_reference || 'commission'}. Check your Bumu Paygo portal for details.`
  });
}
