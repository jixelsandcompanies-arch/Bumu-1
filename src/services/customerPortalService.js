import { buildApiUrl } from './apiUrl.js';

const CUSTOMER_TOKEN_KEY = 'bumu-customer-token';
const REQUEST_TIMEOUT_MS = 20000;

export function getCustomerToken() {
  return window.sessionStorage.getItem(CUSTOMER_TOKEN_KEY) || '';
}

function setCustomerSession({ token }) {
  window.sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

function clearCustomerSession() {
  window.sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getCustomerToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });
  } catch (error) {
    throw new Error(error.name === 'AbortError'
      ? 'The request took too long. Please try again.'
      : 'The system is not reachable right now. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  const data = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  })() : {};

  if (!response.ok) {
    throw new Error(data.message || 'Customer request failed. Check your connection and try again.');
  }

  return data;
}

function isStrongPassword(value) {
  return (
    String(value || '').length >= 10 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export const customerPortalService = {
  hasSession() {
    return Boolean(getCustomerToken());
  },

  async login({ email, password }) {
    const data = await request('/api/customer/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setCustomerSession(data);
    return data.user;
  },

  async activate({ otp, email }) {
    const data = await request('/api/customer/auth/activate', {
      method: 'POST',
      body: { otp, email }
    });
    if (data.token) setCustomerSession(data);
    return data;
  },

  logout() {
    clearCustomerSession();
  },

  async loadPortal() {
    const data = await request('/api/customer/portal');
    return data.portal;
  },

  async createPaymentRequest({ amount, phone }) {
    return request('/api/customer/payment-requests', {
      method: 'POST',
      body: { amount, phone }
    });
  },

  async requestPasswordReset({ email, phone }) {
    return request('/api/customer/password-reset-requests', {
      method: 'POST',
      body: { email, phone }
    });
  },

  async verifyPasswordResetOtp({ email, otp }) {
    return request('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: email, otp }
    });
  },

  async resetPassword({ email, otp, password }) {
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 10 characters and include uppercase, lowercase, number, and special character.');
    }

    return request('/api/auth/reset-password', {
      method: 'POST',
      body: { identifier: email, otp, password }
    });
  }
};
