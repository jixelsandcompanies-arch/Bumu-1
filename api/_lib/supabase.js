import { createClient } from '@supabase/supabase-js';

let client = null;
let authClient = null;

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase() {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  }

  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return client;
}

export function getSupabaseAuth() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.');
  }

  if (!authClient) {
    authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return authClient;
}

export async function requireFinanceUser(req) {
  if (process.env.SUPABASE_AUTH_REQUIRED === 'false') {
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    const error = new Error('Sign in is required.');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await getSupabase().auth.getUser(token);

  if (error || !data?.user) {
    const authError = new Error('Your session is invalid or expired.');
    authError.statusCode = 401;
    throw authError;
  }

  const role = data.user.app_metadata?.role || data.user.user_metadata?.role;

  if (role !== 'finance' && role !== 'admin') {
    const roleError = new Error('Finance access is required.');
    roleError.statusCode = 403;
    throw roleError;
  }

  return data.user;
}
