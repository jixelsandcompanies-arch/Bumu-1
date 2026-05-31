import { isValidPhoneOrEmail } from '../utils/validation.js';

export const authService = {
  async login(identifier, password) {
    if (!isValidPhoneOrEmail(identifier) || password.length < 4) {
      throw new Error('Enter valid finance credentials.');
    }

    return { id: 'USR-FIN-001', fullName: 'Finance Officer', role: 'finance' };
  }
};
