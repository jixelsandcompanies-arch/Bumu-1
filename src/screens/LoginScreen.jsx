import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, LockKeyhole, LogIn, Mail, UserPlus } from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { authService } from '../services/authService.js';
import { colors } from '../theme/colors.js';
import bumuLogo from '../../BumuLogo.jpeg';

const pages = {
  login: '#/login',
  register: '#/register',
  forgot: '#/forgot-password'
};

function pageFromHash() {
  if (window.location.hash === pages.register) return 'register';
  if (window.location.hash === pages.forgot) return 'forgot';
  return 'login';
}

function goToPage(page) {
  window.history.pushState(null, '', pages[page]);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function LoginScreen({ onLogin }) {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', pages.login);
    }

    function handleHashChange() {
      setPage(pageFromHash());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={styles.shell}>
        <AuthHeader page={page} />
        {page === 'login' && <LoginPage onLogin={onLogin} />}
        {page === 'register' && <RegisterPage />}
        {page === 'forgot' && <ForgotPasswordPage />}
      </View>
    </ScrollView>
  );
}

function AuthHeader({ page }) {
  const title = {
    login: 'Finance sign in',
    register: 'Create finance account',
    forgot: 'Reset password'
  }[page];
  const subtitle = {
    login: 'Access payments, riders, commissions, reports, and reconciliation.',
    register: '',
    forgot: 'Enter your account, verify the OTP, and change your password.'
  }[page];

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Image source={bumuLogo} style={styles.markLogo} />
        </View>
        <View style={{ minWidth: 0 }}>
          <Text style={styles.brand}>Bumu Paygo</Text>
          <Text style={styles.subBrand}>Bike payments and collections</Text>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <View style={styles.lockRow}>
          <LockKeyhole size={18} color={colors.primary} />
          <Text style={styles.lockText}>Finance team only</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setError('');
      const user = await authService.login(identifier, password);
      if (user.role !== 'finance') {
        setError('This sign-in is only for the finance team.');
        return;
      }
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <View style={styles.form}>
      <Field
        label="Personal email or phone"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="yourname@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      {error ? <Text style={styles.successText}>{error}</Text> : null}
      <Button icon={LogIn} onPress={handleLogin} style={styles.fullButton}>Sign in</Button>
      <View style={styles.linkRow}>
        <AuthLink label="Create account" onPress={() => goToPage('register')} />
        <AuthLink label="Forgot password?" onPress={() => goToPage('forgot')} />
      </View>
    </View>
  );
}

function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const passwordChecks = usePasswordChecks(password, confirmPassword);
  const canSubmit = fullName.trim() && email.trim() && passwordChecks.allValid;

  async function handleRegister() {
    if (!canSubmit) {
      setError('Complete the account details and password checks.');
      return;
    }

    try {
      setError('');
      await authService.register({ fullName, email, phone, password });
      authService.logout();
      goToPage('login');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <View style={styles.form}>
      <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Finance Officer" />
      <Field label="Personal email" value={email} onChangeText={setEmail} placeholder="yourname@example.com" />
      <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+254712345678" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
      <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry />
      {(password || confirmPassword) ? (
        <Text style={styles.passwordHint}>
          Password must include uppercase, lowercase, number, special character, and match confirmation.
        </Text>
      ) : null}
      {error ? <Text style={styles.successText}>{error}</Text> : null}
      <Button icon={UserPlus} onPress={handleRegister} style={[styles.fullButton, styles.submitButtonSpacing]}>Create account</Button>
      <View style={styles.singleLinkRow}>
        <AuthLink label="Back to sign in" onPress={() => goToPage('login')} />
      </View>
    </View>
  );
}

function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const passwordChecks = usePasswordChecks(password, confirmPassword);
  const otpComplete = /^\d{6}$/.test(otp.trim());
  const otpRemainingMs = Math.max(otpExpiresAt - now, 0);
  const otpExpired = otpSent && otpRemainingMs === 0;
  const otpRemainingText = formatCountdown(otpRemainingMs);

  useEffect(() => {
    if (otpVerified) return;
    setPassword('');
    setConfirmPassword('');
  }, [otpVerified]);

  useEffect(() => {
    if (!otpSent || otpVerified) return undefined;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpSent, otpVerified]);

  useEffect(() => {
    if (!otpExpired) return;
    setOtpVerified(false);
    setOtp('');
  }, [otpExpired]);

  async function sendOtp() {
    try {
      setError('');
      await authService.requestPasswordReset(identifier);
      setMaskedIdentifier(maskAccount(identifier));
      setOtpSent(true);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setNow(Date.now());
      setNotice('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function resetPassword() {
    if (!otpVerified || !passwordChecks.allValid) {
      setError('Verify the OTP and complete the password checks.');
      return;
    }

    try {
      setError('');
      await authService.resetPassword({ identifier, otp, password });
      setNotice('Password updated. You can sign in now.');
      window.setTimeout(() => goToPage('login'), 900);
    } catch (err) {
      setError(err.message);
    }
  }

  function backToResendOtp() {
    setOtpSent(false);
    setOtpVerified(false);
    setOtpExpiresAt(0);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setNotice('');
    setError('');
  }

  async function verifyOtp() {
    setError('');

    if (otpExpired) {
      setOtpVerified(false);
      setError('OTP expired. Go back and resend OTP.');
      return;
    }

    if (!otpComplete) {
      setOtpVerified(false);
      setError('Enter the 6-digit OTP.');
      return;
    }

    try {
      await authService.verifyPasswordResetOtp({ identifier, otp });
      setOtpVerified(true);
    } catch (err) {
      setOtpVerified(false);
      setError(err.message);
    }
  }

  function updateOtp(value) {
    setOtp(value);
    setOtpVerified(false);
  }

  return (
    <View style={styles.form}>
      {!otpSent ? (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formGroupTitle}>Account</Text>
            <Text style={styles.formGroupHelp}>Enter your email to receive OTP.</Text>
          </View>
          <Field
            label="Email or phone"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="yourname@example.com"
          />
          <Button icon={Mail} onPress={sendOtp} style={styles.fullButton}>Send OTP</Button>
        </>
      ) : (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formGroupTitle}>Password and OTP</Text>
            {!otpVerified && (
              <>
                <Text style={styles.formGroupHelp}>OTP was sent to {maskedIdentifier}.</Text>
                <Text style={otpExpired ? styles.countdownExpired : styles.countdownText}>
                  {otpExpired ? 'OTP expired' : `OTP expires in ${otpRemainingText}`}
                </Text>
              </>
            )}
          </View>
          {!otpVerified && (
            <>
              <View style={styles.compactActionRow}>
                <Pressable onPress={backToResendOtp} style={styles.compactLinkButton}>
                  <Text style={styles.compactLinkText}>No OTP received? Confirm your email and resend the code.</Text>
                </Pressable>
              </View>
              <View>
                <View style={styles.otpLabelRow}>
                  <Text style={styles.otpLabel}>OTP</Text>
                  <Text style={styles.otpInlineHint}>Enter the 6-digit OTP.</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholderTextColor={colors.muted}
                  value={otp}
                  onChangeText={updateOtp}
                  placeholder="Enter OTP"
                  maxLength={6}
                />
              </View>
              <Button icon={KeyRound} onPress={verifyOtp} style={styles.fullButton}>Verify OTP</Button>
            </>
          )}
          {otpVerified && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formGroupHelp}>OTP verified. Set your new password.</Text>
              </View>
              <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
              <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry />
              <Button icon={KeyRound} onPress={resetPassword} style={styles.fullButton}>Change password</Button>
            </>
          )}
        </>
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.successText}>{error}</Text> : null}
      <View style={styles.singleLinkRow}>
        <AuthLink label="Back to sign in" onPress={() => goToPage('login')} />
      </View>
    </View>
  );
}

function maskAccount(value) {
  const account = String(value || '').trim();

  if (account.includes('@')) {
    const [name, domain] = account.split('@');
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  }

  const digits = account.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `${account.slice(0, 3)}****${account.slice(-2)}`;
  }

  return 'your account';
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function Field({ label, ...props }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

function AuthLink({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.linkButton}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function usePasswordChecks(password, confirmPassword) {
  return useMemo(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: Boolean(password) && password === confirmPassword
    };

    return {
      ...checks,
      allValid: Object.values(checks).every(Boolean)
    };
  }, [password, confirmPassword]);
}

const styles = StyleSheet.create({
  root: {
    height: 'var(--app-vh)',
    backgroundColor: 'var(--app-bg)',
    width: '100%',
    overflowY: 'auto'
  },
  rootContent: {
    minHeight: 'var(--app-vh)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    paddingTop: 34,
    paddingBottom: 32
  },
  shell: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'var(--app-surface)',
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 10,
    padding: 14
  },
  header: {
    gap: 10,
    marginBottom: 12
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  markLogo: {
    width: 34,
    height: 34,
    borderRadius: 6
  },
  markText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '500'
  },
  brand: {
    fontSize: 20,
    fontWeight: '500'
  },
  subBrand: {
    color: 'var(--app-muted)',
    marginTop: 1
  },
  titleBlock: {
    gap: 6
  },
  lockRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 28
  },
  lockText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 13
  },
  title: {
    fontSize: 21,
    fontWeight: '500'
  },
  subtitle: {
    color: 'var(--app-muted)',
    lineHeight: 18
  },
  form: {
    gap: 11
  },
  formGroup: {
    gap: 5,
    marginBottom: 3
  },
  formGroupTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  formGroupHelp: {
    color: 'var(--app-muted)',
    fontSize: 13,
    lineHeight: 18
  },
  countdownText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right'
  },
  countdownExpired: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right'
  },
  label: {
    fontSize: 12,
    color: 'var(--app-muted)',
    fontWeight: '500',
    marginBottom: 6
  },
  input: {
    minHeight: 41,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 8,
    paddingHorizontal: 12,
    outlineStyle: 'none',
    color: 'var(--app-text)',
    backgroundColor: 'var(--app-surface)'
  },
  fullButton: {
    width: '100%'
  },
  submitButtonSpacing: {
    marginTop: 4
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  singleLinkRow: {
    alignItems: 'center'
  },
  compactActionRow: {
    alignItems: 'flex-start',
    marginTop: -6,
    marginBottom: -2
  },
  compactLinkButton: {
    minHeight: 18,
    justifyContent: 'center'
  },
  compactLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500'
  },
  otpLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    marginBottom: 8
  },
  otpLabel: {
    fontSize: 12,
    color: 'var(--app-muted)',
    fontWeight: '500'
  },
  otpInlineHint: {
    color: colors.success,
    fontSize: 12
  },
  otpInlineHintSuccess: {
    color: colors.success,
    fontSize: 12
  },
  linkButton: {
    minHeight: 32,
    justifyContent: 'center'
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500'
  },
  help: {
    textAlign: 'center',
    color: 'var(--app-muted)',
    fontSize: 12
  },
  error: {
    color: colors.danger,
    fontWeight: '500'
  },
  successText: {
    color: colors.success,
    fontWeight: '500'
  },
  passwordHint: {
    color: colors.success,
    fontSize: 11,
    lineHeight: 16,
    marginTop: -3
  },
  notice: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500'
  }
});
