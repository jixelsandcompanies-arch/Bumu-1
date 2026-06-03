const AGENT_TOKEN_KEY = 'bumu-agent-token';
const AGENT_USER_KEY = 'bumu-agent-user';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildUrl(path) {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();
}

function getToken() {
  return window.sessionStorage.getItem(AGENT_TOKEN_KEY) || '';
}

function setSession({ token, user }) {
  window.sessionStorage.setItem(AGENT_TOKEN_KEY, token);
  window.sessionStorage.setItem(AGENT_USER_KEY, JSON.stringify(user || {}));
}

function clearSession() {
  window.sessionStorage.removeItem(AGENT_TOKEN_KEY);
  window.sessionStorage.removeItem(AGENT_USER_KEY);
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
    throw new Error(data.message || 'Agent request failed.');
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

export const agentWorkspaceService = {
  hasSession() {
    return Boolean(getToken());
  },

  async login({ email, password }) {
    const data = await request('/api/agent/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setSession(data);
    return data.user;
  },

  async register({ fullName, nationalId, phone, region, email, password }) {
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 10 characters and include uppercase, lowercase, number, and special character.');
    }

    return request('/api/agent/auth/register', {
      method: 'POST',
      body: { fullName, nationalId, phone, region, email, password }
    });
  },

  async requestPasswordReset({ email, phone }) {
    return request('/api/agent/password-reset-requests', {
      method: 'POST',
      body: { email, phone }
    });
  },

  logout() {
    clearSession();
  },

  async loadPortal() {
    const data = await request('/api/agent/portal');
    return data.portal;
  },

  async createCustomer(customer) {
    return request('/api/agent/customers', {
      method: 'POST',
      body: customer
    });
  },

  async createTask(task) {
    return request('/api/agent/tasks', {
      method: 'POST',
      body: task
    });
  },

  async completeTask(id) {
    return request(`/api/agent/tasks/${encodeURIComponent(id)}/complete`, {
      method: 'POST'
    });
  }
};
