export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function apiGet(path, baseUrl = API_BASE_URL) {
  if (!baseUrl) {
    throw new Error(`API not configured for ${path}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include'
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
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Request failed: ${response.status}`);
  }

  return response.json();
}
