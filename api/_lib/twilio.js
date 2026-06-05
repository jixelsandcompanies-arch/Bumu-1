const TWILIO_MESSAGES_URL = 'https://api.twilio.com/2010-04-01/Accounts';
const AFRICASTALKING_MESSAGES_URL = 'https://api.africastalking.com/version1/messaging';
const AFRICASTALKING_SANDBOX_MESSAGES_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

function envValue(name) {
  return String(process.env[name] || '').trim();
}

function maskValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}...`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

export function twilioConfigDiagnostics() {
  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const messagingServiceSid = envValue('TWILIO_MESSAGING_SERVICE_SID');
  const fromNumber = envValue('TWILIO_FROM_NUMBER');
  const authToken = envValue('TWILIO_AUTH_TOKEN');

  return {
    accountSid: maskValue(accountSid),
    accountSidStartsWithAC: accountSid.startsWith('AC'),
    accountSidLength: accountSid.length,
    authTokenConfigured: Boolean(authToken),
    authTokenLength: authToken.length,
    messagingServiceSid: maskValue(messagingServiceSid),
    messagingServiceSidStartsWithMG: messagingServiceSid.startsWith('MG'),
    fromNumberConfigured: Boolean(fromNumber)
  };
}

export function africasTalkingConfigDiagnostics() {
  const username = envValue('AFRICASTALKING_USERNAME');
  const apiKey = envValue('AFRICASTALKING_API_KEY');
  const senderId = envValue('AFRICASTALKING_SENDER_ID');
  const environment = envValue('AFRICASTALKING_ENV') || 'production';

  return {
    username: maskValue(username),
    usernameConfigured: Boolean(username),
    apiKeyConfigured: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    senderId: senderId || '',
    senderIdConfigured: Boolean(senderId),
    environment
  };
}

function activeSmsProvider() {
  const configuredProvider = envValue('SMS_PROVIDER').toLowerCase();
  if (configuredProvider) return configuredProvider;
  if (hasAfricasTalkingSmsConfig()) return 'africastalking';
  return 'twilio';
}

export function hasAfricasTalkingSmsConfig() {
  return Boolean(
    envValue('AFRICASTALKING_USERNAME') &&
    envValue('AFRICASTALKING_API_KEY')
  );
}

export function smsConfigDiagnostics() {
  const provider = activeSmsProvider();
  return {
    provider,
    configured: hasSmsConfig(),
    twilio: twilioConfigDiagnostics(),
    africasTalking: africasTalkingConfigDiagnostics()
  };
}

export function hasTwilioSmsConfig() {
  return Boolean(
    envValue('TWILIO_ACCOUNT_SID') &&
    envValue('TWILIO_AUTH_TOKEN') &&
    (envValue('TWILIO_MESSAGING_SERVICE_SID') || envValue('TWILIO_FROM_NUMBER'))
  );
}

export function hasSmsConfig() {
  return activeSmsProvider() === 'africastalking'
    ? hasAfricasTalkingSmsConfig()
    : hasTwilioSmsConfig();
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
  if (!configured) return 'https://bumu-beta.vercel.app';
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

export async function sendSms({ to, message }) {
  if (activeSmsProvider() === 'africastalking') {
    return sendAfricasTalkingSms({ to, message });
  }

  return sendTwilioSms({ to, message });
}

async function sendAfricasTalkingSms({ to, message }) {
  if (!hasAfricasTalkingSmsConfig()) {
    return { configured: false, delivered: false, provider: 'africastalking' };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return { configured: true, delivered: false, provider: 'africastalking', reason: 'missing_phone' };
  }

  const environment = envValue('AFRICASTALKING_ENV').toLowerCase();
  const url = environment === 'sandbox' ? AFRICASTALKING_SANDBOX_MESSAGES_URL : AFRICASTALKING_MESSAGES_URL;
  const body = new URLSearchParams({
    username: envValue('AFRICASTALKING_USERNAME'),
    to: phone,
    message: String(message || '')
  });
  const senderId = envValue('AFRICASTALKING_SENDER_ID');
  if (senderId) body.set('from', senderId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Apikey: envValue('AFRICASTALKING_API_KEY'),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Africa’s Talking SMS request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  const recipients = data.SMSMessageData?.Recipients || [];
  const delivered = recipients.length > 0 && recipients.every((item) => String(item.status || '').toLowerCase() === 'success');

  return {
    configured: true,
    delivered,
    provider: 'africastalking',
    response: data,
    sid: recipients[0]?.messageId || null
  };
}

async function sendTwilioSms({ to, message }) {
  if (!hasTwilioSmsConfig()) {
    return { configured: false, delivered: false, provider: 'twilio' };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return { configured: true, delivered: false, provider: 'twilio', reason: 'missing_phone' };
  }

  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const authToken = envValue('TWILIO_AUTH_TOKEN');
  const messagingServiceSid = envValue('TWILIO_MESSAGING_SERVICE_SID');
  const fromNumber = envValue('TWILIO_FROM_NUMBER');

  if (!accountSid.startsWith('AC')) {
    const error = new Error('TWILIO_ACCOUNT_SID must be the Account SID that starts with AC.');
    error.statusCode = 500;
    error.providerResponse = twilioConfigDiagnostics();
    throw error;
  }

  const body = new URLSearchParams({
    To: phone,
    Body: String(message || '')
  });

  if (messagingServiceSid) {
    body.set('MessagingServiceSid', messagingServiceSid);
  } else {
    body.set('From', fromNumber);
  }

  const response = await fetch(`${TWILIO_MESSAGES_URL}/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Twilio SMS request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return {
    configured: true,
    delivered: !['failed', 'undelivered'].includes(String(data.status || '').toLowerCase()),
    provider: 'twilio',
    response: data,
    sid: data.sid
  };
}

export async function getSmsStatus(sid) {
  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const authToken = envValue('TWILIO_AUTH_TOKEN');
  const messageSid = String(sid || '').trim();

  if (!accountSid.startsWith('AC') || !messageSid) {
    return null;
  }

  const response = await fetch(`${TWILIO_MESSAGES_URL}/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(messageSid)}.json`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      Accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Twilio message status request failed.');
    error.statusCode = 502;
    error.providerResponse = data;
    throw error;
  }

  return data;
}

export async function sendOtpSms({ phone, otp }) {
  return sendSms({
    to: phone,
    message: `Your Bumu Paygo verification code is ${otp}. Valid for 10 minutes. Do not share this code.`
  });
}

export async function sendNextOfKinAcceptanceSms({ phone, otp, customerName, acceptUrl }) {
  const actionText = acceptUrl
    ? `Accept here: ${acceptUrl} or reply 1/YES to accept.`
    : `Reply 1/YES to accept, or give OTP ${otp} to the agent.`;
  return sendSms({
    to: phone,
    message: `Bumu Paygo request: ${customerName || 'A customer'} has named you as next-of-kin. ${actionText} OTP ${otp}. Valid for 10 minutes.`
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
