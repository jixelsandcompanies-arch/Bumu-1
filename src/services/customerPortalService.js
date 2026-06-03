const CUSTOMER_TOKEN_KEY = 'bumu-customer-token';
const CUSTOMER_USER_KEY = 'bumu-customer-user';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildUrl(path) {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();
}

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
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Customer request failed.');
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

  async register({ fullName, nationalId, phone, email, password }) {
    return request('/api/customer/auth/register', {
      method: 'POST',
      body: { fullName, nationalId, phone, email, password }
    });
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
  }
};
