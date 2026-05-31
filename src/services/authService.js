import { isValidPhoneOrEmail } from '../utils/validation.js';
import { apiGet, apiPost, getAuthToken, setAuthToken } from './api.js';

const localAuthEnabled = import.meta.env.VITE_LOCAL_AUTH_ENABLED !== 'false';
const localFinanceEmail = import.meta.env.VITE_LOCAL_FINANCE_EMAIL ?? 'finance@bumupaygo.co.ke';
const localFinancePassword = import.meta.env.VITE_LOCAL_FINANCE_PASSWORD ?? 'Bumu@2026';
const LOCAL_TOKEN = 'local-finance-session';

function localUser() {
  return {
    id: 'local-finance-user',
    email: localFinanceEmail,
    fullName: 'Finance Officer',
    role: 'finance'
  };
}

export const authService = {
  async login(identifier, password) {
    if (!isValidPhoneOrEmail(identifier) || password.length < 8) {
      throw new Error('Enter valid finance credentials.');
    }

    if (
      localAuthEnabled &&
      identifier.trim().toLowerCase() === localFinanceEmail.toLowerCase() &&
      password === localFinancePassword
    ) {
      setAuthToken(LOCAL_TOKEN);
      return localUser();
    }

    const result = await apiPost('/auth/login', { identifier, password });

    setAuthToken(result.accessToken);
    return result.user;
  },

  async currentUser() {
    if (localAuthEnabled && getAuthToken() === LOCAL_TOKEN) {
      return localUser();
    }

    return apiGet('/auth/me');
  },

  logout() {
    setAuthToken('');
  }
};
