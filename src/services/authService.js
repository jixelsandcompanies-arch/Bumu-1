import { isValidPhoneOrEmail } from '../utils/validation.js';
import { apiGet, apiPost, setAuthToken } from './api.js';

export const authService = {
  async login(identifier, password) {
    if (!isValidPhoneOrEmail(identifier) || password.length < 8) {
      throw new Error('Enter valid finance credentials.');
    }

    const result = await apiPost('/auth/login', { identifier, password });

    setAuthToken(result.accessToken);
    return result.user;
  },

  async currentUser() {
    return apiGet('/auth/me');
  },

  logout() {
    setAuthToken('');
  }
};
