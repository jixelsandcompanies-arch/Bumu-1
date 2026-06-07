import { getSupabase, getSupabaseAuth } from './supabase.js';
import { validateStrongPassword } from './security.js';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function mapAuthError(error, fallback = 'Password reset could not be completed.') {
  if (!error) return null;
  const mapped = new Error(error.message || fallback);
  mapped.statusCode = 400;
  return mapped;
}

async function findAuthUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  let page = 1;
  while (page <= 10) {
    const { data, error } = await getSupabase().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw mapAuthError(error, 'Could not check account.');

    const user = data.users.find((item) => normalizeEmail(item.email) === normalized);
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

function assertEmail(identifier) {
  const email = normalizeEmail(identifier);
  if (!email || !email.includes('@')) {
    const error = new Error('Enter your email to receive OTP.');
    error.statusCode = 400;
    throw error;
  }
  return email;
}

export async function requestSupabasePasswordResetOtp(body = {}) {
  const email = assertEmail(body.identifier || body.email);
  const sourcePortal = String(body.sourcePortal || body.source_portal || 'finance').trim() || 'finance';
  const phone = String(body.phone || '').trim();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const user = await findAuthUserByEmail(email);

  if (!user) {
    return {
      sent: true,
      delivered: true,
      provider: 'supabase',
      message: 'OTP sent. If it does not arrive, confirm your email and resend the code.'
    };
  }

  const { error } = await getSupabaseAuth().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false
    }
  });

  if (error) throw mapAuthError(error, 'OTP could not be sent.');

  const inserted = await getSupabase()
    .from('password_reset_requests')
    .insert({
      email,
      phone,
      status: 'otp_sent',
      source_portal: sourcePortal,
      otp_expires_at: expiresAt,
      provider_response: { provider: 'supabase_auth_otp' }
    })
    .select('id,email,status,otp_expires_at,source_portal,created_at')
    .single();

  if (inserted.error) throw mapAuthError(inserted.error, 'Password reset request could not be saved.');

  return {
    sent: true,
    delivered: true,
    provider: 'supabase',
    request: inserted.data,
    message: 'OTP sent. If it does not arrive, confirm your email and resend the code.'
  };
}

export async function verifySupabasePasswordResetOtp(body = {}) {
  const email = assertEmail(body.identifier || body.email);
  const otp = String(body.otp || '').trim();

  if (!/^\d{6}$/.test(otp)) {
    const error = new Error('Enter the 6-digit OTP.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await getSupabaseAuth().auth.verifyOtp({
    email,
    token: otp,
    type: 'email'
  });

  if (error || !data?.user) {
    const invalid = new Error('Invalid or expired OTP.');
    invalid.statusCode = 400;
    throw invalid;
  }

  const current = await getSupabase()
    .from('password_reset_requests')
    .select('*')
    .eq('email', email)
    .in('status', ['otp_sent', 'otp_required'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current.error) throw mapAuthError(current.error, 'Password reset request could not be checked.');

  const verifiedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const payload = {
    email,
    phone: current.data?.phone || '',
    status: 'verified',
    source_portal: current.data?.source_portal || 'finance',
    otp_verified_at: verifiedAt,
    otp_expires_at: expiresAt,
    provider_response: {
      ...(current.data?.provider_response || {}),
      provider: 'supabase_auth_otp',
      verified: true
    }
  };

  const saved = current.data
    ? await getSupabase()
      .from('password_reset_requests')
      .update(payload)
      .eq('id', current.data.id)
      .select('id,email,status,otp_verified_at,otp_expires_at')
      .single()
    : await getSupabase()
      .from('password_reset_requests')
      .insert(payload)
      .select('id,email,status,otp_verified_at,otp_expires_at')
      .single();

  if (saved.error) throw mapAuthError(saved.error, 'OTP verification could not be saved.');
  return { verified: true, request: saved.data };
}

export async function resetPasswordWithSupabaseOtp(body = {}) {
  const email = assertEmail(body.identifier || body.email);
  const password = String(body.password || '');

  if (!validateStrongPassword(password)) {
    const error = new Error('Enter a valid new password.');
    error.statusCode = 400;
    throw error;
  }

  const resetRequest = await getSupabase()
    .from('password_reset_requests')
    .select('*')
    .eq('email', email)
    .eq('status', 'verified')
    .order('otp_verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resetRequest.error) throw mapAuthError(resetRequest.error, 'Password reset request could not be checked.');

  if (!resetRequest.data || new Date(resetRequest.data.otp_expires_at).getTime() < Date.now()) {
    const invalid = new Error('Invalid or expired OTP.');
    invalid.statusCode = 400;
    throw invalid;
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
    const missing = new Error('Account was not found.');
    missing.statusCode = 404;
    throw missing;
  }

  const updateUser = await getSupabase().auth.admin.updateUserById(user.id, { password });
  if (updateUser.error) throw mapAuthError(updateUser.error, 'Password could not be changed.');

  const completed = await getSupabase()
    .from('password_reset_requests')
    .update({
      status: 'completed',
      provider_response: {
        ...(resetRequest.data.provider_response || {}),
        completed: true,
        completedAt: new Date().toISOString()
      }
    })
    .eq('id', resetRequest.data.id)
    .select('id,email,status')
    .single();

  if (completed.error) throw mapAuthError(completed.error, 'Password reset could not be completed.');
  return { updated: true, request: completed.data };
}
