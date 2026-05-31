import { createClient } from '@supabase/supabase-js';

let client = null;
let authClient = null;

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase environment is not configured on the backend.');
  }

  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return client;
}

export function getSupabaseAuth() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase auth environment is not configured on the backend.');
  }

  if (!authClient) {
    authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return authClient;
}

export async function requireFinanceUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    const error = new Error('Sign in is required.');
    error.statusCode = 401;
    throw error;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    const authError = new Error('Your session is invalid or expired.');
    authError.statusCode = 401;
    throw authError;
  }

  const role = data.user.app_metadata?.role || data.user.user_metadata?.role;

  if (role !== 'finance') {
    const roleError = new Error('Finance access is required.');
    roleError.statusCode = 403;
    throw roleError;
  }

  return data.user;
}
