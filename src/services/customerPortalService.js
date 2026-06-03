import { buildApiUrl } from './apiUrl.js';

const CUSTOMER_TOKEN_KEY = 'bumu-customer-token';
const CUSTOMER_USER_KEY = 'bumu-customer-user';
const REQUEST_TIMEOUT_MS = 20000;

export function getCustomerToken() {
  return window.sessionStorage.getItem(CUSTOMER_TOKEN_KEY) || '';
}

function setCustomerSession({ token, user }) {
  window.sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  window.sessionStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user || {}));
}

function clearCustomerSession() {
  window.sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.sessionStorage.removeItem(CUSTOMER_USER_KEY);
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
      ? 'Backend request timed out. Check Vercel API logs and Supabase environment variables.'
      : 'Backend API is not reachable. Leave VITE_API_BASE_URL blank on Vercel or check the backend domain/CORS/CSP settings.');
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
    throw new Error(data.message || `Customer request failed with HTTP ${response.status}. Check that Vercel API routes are deployed.`);
  }

  return data;
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
