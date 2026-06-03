import { getAuthToken } from './authSession.js';
import { buildApiUrl } from './apiUrl.js';

async function request(path, { method = 'GET', params, body } = {}) {
  const token = getAuthToken();
  const response = await fetch(buildApiUrl(path, params), {
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
    throw new Error(data.message || `Backend request failed: ${path}`);
  }

  return data;
}

export const backendClient = {
  isConfigured: true,
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body })
};
