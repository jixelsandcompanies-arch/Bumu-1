const AUTH_TOKEN_KEY = 'bumu-auth-token';

export function getAuthToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY) || window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);

  if (token) {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
