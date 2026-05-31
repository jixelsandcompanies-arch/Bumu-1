import { handleError, json, methodNotAllowed } from '../_lib/respond.js';
import { getSupabaseAuth } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const { identifier, password } = req.body ?? {};

    if (!identifier || !password) {
      throw new Error('Email and password are required.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      throw new Error('Use your finance email address to sign in.');
    }

    const supabase = getSupabaseAuth();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password
    });

    if (error || !data?.session || !data?.user) {
      const authError = new Error('Invalid email or password.');
      authError.statusCode = 401;
      throw authError;
    }

    const role = data.user.app_metadata?.role || data.user.user_metadata?.role;

    if (role !== 'finance') {
      const roleError = new Error('This sign-in is only for the finance team.');
      roleError.statusCode = 403;
      throw roleError;
    }

    json(res, 200, {
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email,
        role
      }
    });
  } catch (error) {
    handleError(res, error);
  }
}
