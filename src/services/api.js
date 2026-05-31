export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const AUTH_TOKEN_KEY = 'bumu-auth-token';

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path, baseUrl = API_BASE_URL) {
  if (!baseUrl) {
    throw new Error(`API not configured for ${path}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: authHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function apiPost(path, body, baseUrl = API_BASE_URL) {
  if (!baseUrl) {
    throw new Error(`API not configured for ${path}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Request failed: ${response.status}`);
  }

  return response.json();
}
