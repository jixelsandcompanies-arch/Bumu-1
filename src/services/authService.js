import { getAuthToken, setAuthToken } from './authSession.js';
import { buildApiUrl } from './apiUrl.js';

const REQUEST_TIMEOUT_MS = 20000;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
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

async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = getAuthToken();
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
    throw new Error(data.message || `Authentication request failed with HTTP ${response.status}. Check that Vercel API routes are deployed.`);
  }

  return data;
}

export const authService = {
  async login(identifier, password) {
    const email = identifier.trim().toLowerCase();

    if (!isValidEmail(email) || password.length < 8) {
      throw new Error('Enter the email and password used during registration.');
    }

    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { identifier: email, password }
    });
    setAuthToken(data.token);
    return data.user;
  },

  async register({ fullName, email, phone, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!fullName.trim() || !normalizedEmail || !isStrongPassword(password)) {
      throw new Error('Password must be at least 10 characters and include uppercase, lowercase, number, and special character.');
    }

    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password
      }
    });
  },

  async currentUser() {
    const data = await apiRequest('/api/auth/me');
    return data.user;
  },

  async requestPasswordReset(identifier) {
    return apiRequest('/api/auth/request-reset', {
      method: 'POST',
      body: { identifier: identifier.trim() }
    });
  },

  async verifyPasswordResetOtp({ identifier, otp }) {
    return apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: identifier.trim(), otp }
    });
  },

  async resetPassword({ identifier, otp, password }) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: { identifier: identifier.trim(), otp, password }
    });
  },

  logout() {
    setAuthToken('');
  }
};
