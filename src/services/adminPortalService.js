const ADMIN_TOKEN_KEY = 'bumu-admin-token';
const ADMIN_USER_KEY = 'bumu-admin-user';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildUrl(path) {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();
}

function getToken() {
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setSession({ token, user }) {
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || {}));
}

function clearSession() {
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  window.sessionStorage.removeItem(ADMIN_USER_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
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
    throw new Error(data.message || 'Admin request failed.');
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

export const adminPortalService = {
  hasSession() {
    return Boolean(getToken());
  },

  async login({ email, password }) {
    const data = await request('/api/admin/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setSession(data);
    return data.user;
  },

  async register({ fullName, email, phone, password, setupCode }) {
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 10 characters and include uppercase, lowercase, number, and special character.');
    }

    return request('/api/admin/auth/register', {
      method: 'POST',
      body: { fullName, email, phone, password, setupCode }
    });
  },

  logout() {
    clearSession();
  },

  async loadPortal() {
    const data = await request('/api/admin/portal');
    return data.portal;
  },

  async createAgent(agent) {
    return request('/api/admin/agents', {
      method: 'POST',
      body: agent
    });
  },

  async createCustomer(customer) {
    return request('/api/admin/customers', {
      method: 'POST',
      body: customer
    });
  },

  async createProduct(product) {
    return request('/api/admin/products', {
      method: 'POST',
      body: product
    });
  }
};
