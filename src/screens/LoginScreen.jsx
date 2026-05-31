import React, { useState } from 'react';
import { CheckCircle2, CircleAlert, LockKeyhole, LogIn, UserPlus } from 'lucide-react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { colors } from '../theme/colors.js';
import { authService } from '../services/authService.js';

export function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState('finance@bumupaygo.co.ke');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [error, setError] = useState('');

  const resetEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim());
  const resetOtpValid = /^\d{6}$/.test(resetOtp.trim());
  const resetPasswordChecks = {
    length: resetPassword.length >= 8,
    unique: new Set(resetPassword).size >= 8,
    upper: /[A-Z]/.test(resetPassword),
    lower: /[a-z]/.test(resetPassword),
    number: /\d/.test(resetPassword),
    special: /[^A-Za-z0-9]/.test(resetPassword)
  };
  const resetPasswordsMatch = resetPassword && resetPassword === resetConfirmPassword;

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

  function handleRegister() {
    setError('Account creation is managed by the finance admin in Supabase Auth.');
  }

  function sendResetOtp() {
    setResetNotice('Password reset is managed in Supabase Auth. Ask an admin to send a recovery email.');
  }

  function handleResetPassword() {
    setResetNotice('Password reset is managed in Supabase Auth. Ask an admin to send a recovery email.');
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={styles.panel}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>B</Text>
          </View>
          <View>
            <Text style={styles.brand}>Bumu Paygo</Text>
            <Text style={styles.subBrand}>Bike payments and collections</Text>
          </View>
        </View>

        <View style={styles.lockRow}>
          <LockKeyhole size={18} color={colors.primary} />
          <Text style={styles.lockText}>Finance team sign-in</Text>
        </View>

        <View style={styles.modeSwitch}>
          <Pressable
            onPress={() => setMode('login')}
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('register')}
            style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Register</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('forgot')}
            style={[styles.modeButton, mode === 'forgot' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === 'forgot' && styles.modeTextActive]}>Forgot</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'login' ? (
            <>
              <View>
                <Text style={styles.label}>Phone or email</Text>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  style={styles.input}
                  placeholder="finance@bumupaygo.co.ke"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </>
          ) : mode === 'register' ? (
            <>
              <View>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  value={registerName}
                  onChangeText={setRegisterName}
                  style={styles.input}
                  placeholder="e.g. Finance Officer"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  value={registerPhone}
                  onChangeText={setRegisterPhone}
                  style={styles.input}
                  placeholder="+254712345678"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="At least 6 characters and a number"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </>
          ) : (
            <>
              {!resetOtpSent ? (
                <>
                  <View>
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      style={styles.input}
                      placeholder="finance@bumupaygo.co.ke"
                      placeholderTextColor="var(--app-muted)"
                    />
                  </View>
                  <View style={styles.resetActionRow}>
                    <Text style={[styles.detectLabel, resetEmailValid && { color: colors.success }]}>
                      {resetEmailValid ? 'Valid email' : 'Enter your email to receive OTP'}
                    </Text>
                    <Pressable onPress={sendResetOtp} style={[styles.smallAction, !resetEmailValid && styles.smallActionDisabled]}>
                      <Text style={styles.smallActionText}>Send OTP</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.resetActionRow}>
                    <Pressable
                      onPress={() => {
                        setResetOtpSent(false);
                        setResetNotice('No OTP received? Confirm your email and resend the code.');
                      }}
                      style={styles.backButton}
                    >
                      <Text style={styles.backButtonText}>Back to resend OTP</Text>
                    </Pressable>
                    <Text style={styles.detectDetail}>Enter the OTP sent to your email.</Text>
                  </View>
                  <TextInput
                    value={resetOtp}
                    onChangeText={setResetOtp}
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="var(--app-muted)"
                    maxLength={6}
                  />
                  <TextInput
                    value={resetPassword}
                    onChangeText={setResetPassword}
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor="var(--app-muted)"
                    secureTextEntry
                  />
                  <TextInput
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor="var(--app-muted)"
                    secureTextEntry
                  />
                  <View style={styles.detectBox}>
                    <DetectRow valid={resetOtpValid} label="OTP code" detail="Must be exactly 6 digits" />
                    <DetectRow valid={resetPasswordChecks.length} label="8 characters" detail="Minimum password length" />
                    <DetectRow valid={resetPasswordChecks.unique} label="8 different characters" detail="Avoid repeating the same characters" />
                    <DetectRow valid={resetPasswordChecks.upper} label="Uppercase" detail="Add one uppercase letter" />
                    <DetectRow valid={resetPasswordChecks.lower} label="Lowercase" detail="Add one lowercase letter" />
                    <DetectRow valid={resetPasswordChecks.number} label="Number" detail="Add one number" />
                    <DetectRow valid={resetPasswordChecks.special} label="Special character" detail="Add one special character" />
                    <DetectRow valid={resetPasswordsMatch} label="Password match" detail="New password and confirmation must match" />
                  </View>
                </>
              )}
              {resetNotice ? <Text style={styles.notice}>{resetNotice}</Text> : null}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mode === 'login' ? (
            <Button icon={LogIn} onPress={handleLogin} style={styles.fullButton}>
              Sign in
            </Button>
          ) : mode === 'register' ? (
            <Button icon={UserPlus} onPress={handleRegister} style={styles.fullButton}>
              Create account
            </Button>
          ) : (
            <Button icon={LockKeyhole} onPress={handleResetPassword} style={styles.fullButton}>
              Update password
            </Button>
          )}

          <Pressable>
            <Text style={styles.help}>OTP sign-in keeps finance access protected.</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function DetectRow({ valid, label, detail }) {
  return (
    <View style={styles.detectRow}>
      {valid ? (
        <CheckCircle2 size={17} color={colors.success} />
      ) : (
        <CircleAlert size={17} color={colors.warning} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.detectLabel, valid && { color: colors.success }]}>{label}</Text>
        <Text style={styles.detectDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: '100dvh',
    backgroundColor: 'var(--app-bg)',
    width: '100%',
    overflowY: 'auto'
  },
  rootContent: {
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    paddingTop: 32,
    paddingBottom: 32
  },
  panel: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: 'var(--app-surface)',
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 10,
    padding: 24
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  markText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '500'
  },
  brand: {
    fontSize: 24,
    fontWeight: '500'
  },
  subBrand: {
    color: 'var(--app-muted)',
    marginTop: 3
  },
  lockRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  lockText: {
    color: colors.primary,
    fontWeight: '500'
  },
  form: {
    gap: 14
  },
  modeSwitch: {
    minHeight: 42,
    backgroundColor: 'var(--app-bg)',
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    marginBottom: 18
  },
  resetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap'
  },
  smallAction: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallActionDisabled: {
    opacity: 0.5
  },
  smallActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500'
  },
  backButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    backgroundColor: 'var(--app-surface)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500'
  },
  modeButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeButtonActive: {
    backgroundColor: colors.primary
  },
  modeText: {
    color: 'var(--app-muted)',
    fontWeight: '500'
  },
  modeTextActive: {
    color: '#ffffff'
  },
  label: {
    fontSize: 12,
    color: 'var(--app-muted)',
    fontWeight: '500',
    marginBottom: 6
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 8,
    paddingHorizontal: 12,
    outlineStyle: 'none',
    color: 'var(--app-text)',
    backgroundColor: 'var(--app-surface)'
  },
  error: {
    color: colors.danger,
    fontWeight: '500'
  },
  notice: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500'
  },
  detectBox: {
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 10,
    backgroundColor: 'var(--app-bg)',
    overflow: 'hidden'
  },
  detectRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'var(--app-border)',
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center'
  },
  detectLabel: {
    color: 'var(--app-muted)',
    fontSize: 13,
    fontWeight: '500'
  },
  detectDetail: {
    color: 'var(--app-muted)',
    fontSize: 11,
    marginTop: 2
  },
  fullButton: {
    width: '100%'
  },
  help: {
    textAlign: 'center',
    color: 'var(--app-muted)',
    fontSize: 12
  }
});
