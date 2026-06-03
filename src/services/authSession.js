const AUTH_TOKEN_KEY = 'bumu-auth-token';

export function getAuthToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (token) {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
