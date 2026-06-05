import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import '../../../features/auth/auth.css';

const isSixDigitOtp = (value) => /^\d{6}$/.test(String(value || '').trim());

export default function Auth({ agent, onLogin, onRegister, onResetPassword = () => false, theme = 'light' }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [agentPhoto, setAgentPhoto] = useState('');
  const [agentIdFront, setAgentIdFront] = useState('');
  const [agentIdBack, setAgentIdBack] = useState('');
  const [email, setEmail] = useState(agent?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeVerified, setAdminCodeVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRegistering = mode === 'register';
  const isForgotPassword = mode === 'forgot';

  const handleLogin = async () => {
    setMessage('');
    if (!email || !password) {
      setMessage('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const success = onLogin(email, password);
      if (!success) {
        setMessage('Email or password is incorrect.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }, 900);
  };

  const handleResetPassword = async () => {
    setMessage('');
    if (!email || !adminCode || !password || !confirmPassword) {
      setMessage('Enter email, admin OTP, and the new password.');
      return;
    }
    if (!isSixDigitOtp(adminCode)) {
      setMessage('Enter the 6-digit code sent by admin.');
      return;
    }
    if (password.length < 6) {
      setMessage('Use at least 6 characters for the password.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = onResetPassword(email, password);
      setLoading(false);
      if (!success) {
        setMessage('No approved agent account found for that email.');
        return;
      }
      setMessage('Password reset. Sign in with the new password.');
      setMode('login');
      setAdminCode('');
      setPassword('');
      setConfirmPassword('');
    }, 700);
  };

  const handleRegister = async () => {
    setMessage('');
    if (!fullName || !nationalId || !phone || !region || !agentPhoto || !agentIdFront || !agentIdBack || !email || !password || !confirmPassword) {
      setMessage('Fill in all registration details.');
      return;
    }

    if (password.length < 6) {
      setMessage('Use at least 6 characters for the password.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = onRegister({ fullName, nationalId, phone, region, agentPhoto, agentIdFront, agentIdBack, email, password });
      const success = result === true || result?.success;
      if (!success) {
        setMessage('Unable to register agent. Please try again.');
      } else {
        setMessage(result?.message || 'Agent account created. Waiting for admin approval.');
        setPassword('');
        setConfirmPassword('');
      }
      setLoading(false);
    }, 900);
  };

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setMessage('');
    setPassword('');
    setConfirmPassword('');
    setAdminCode('');
    setAdminCodeVerified(false);
  };

  const openForgotPassword = () => {
    setMode('forgot');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
    setAdminCode('');
    setAdminCodeVerified(false);
  };

  const pickAgentDocument = (setter, label, mode = 'upload') => {
    if (typeof document === 'undefined') {
      setter(`${label} ${mode === 'scan' ? 'scanned' : 'uploaded'}`);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'scan') input.capture = 'environment';
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result || `${mode === 'scan' ? 'Scanned' : 'Uploaded'}: ${file.name}`);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const closeCamera = () => {
    cameraTarget?.stream?.getTracks?.().forEach((track) => track.stop());
    setCameraTarget(null);
  };

  const openAgentCamera = async (setter, label, facingMode = 'environment') => {
    setCameraError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not available in this browser. Use Upload instead.');
      return;
    }
    try {
      closeCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      setCameraTarget({ setter, label, stream });
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch {
      setCameraError('Camera did not open. Use Upload instead.');
    }
  };

  const snapAgentPhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraTarget) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    cameraTarget.setter(canvas.toDataURL('image/jpeg', 0.86));
    closeCamera();
  };

  const AgentDocument = ({ label, value, setter }) => (
    <View style={styles.documentField}>
      <Text style={styles.documentLabel}>{label}</Text>
      <View style={styles.documentBox}>
        {String(value || '').startsWith('data:image') ? (
          <Image source={{ uri: value }} style={styles.documentPreview} />
        ) : (
          <Text style={styles.documentPlaceholder}>{value || 'No image captured yet'}</Text>
        )}
        <View style={styles.documentActions}>
          <TouchableOpacity style={styles.documentButton} onPress={() => pickAgentDocument(setter, label, 'upload')} disabled={loading}>
            <Text style={styles.documentButtonText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.documentButtonAlt} onPress={() => openAgentCamera(setter, label, /photo/i.test(label) ? 'user' : 'environment')} disabled={loading}>
            <Text style={styles.documentButtonAltText}>📷 Scan / Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const verifyAdminCode = () => {
    const verified = isSixDigitOtp(adminCode);
    setAdminCodeVerified(verified);
    setMessage(verified ? 'Admin code verified.' : 'Enter the 6-digit code sent by admin.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginCard}>
        <Text style={styles.title}>BUMU Agent Portal</Text>
        <Text style={styles.subtitle}>
          {isRegistering
            ? 'Create your agent account. Admin must approve it before access is allowed.'
            : isForgotPassword
              ? 'Reset password with the OTP sent by admin.'
              : 'Secure access for approved BUMU agents.'}
        </Text>

        {isRegistering && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="National ID number"
              value={nationalId}
              onChangeText={setNationalId}
              editable={!loading}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Region / Branch"
              value={region}
              onChangeText={setRegion}
              editable={!loading}
            />
            <AgentDocument label="Passport photo" value={agentPhoto} setter={setAgentPhoto} />
            <AgentDocument label="National ID front photo" value={agentIdFront} setter={setAgentIdFront} />
            <AgentDocument label="National ID back photo" value={agentIdBack} setter={setAgentIdBack} />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder={isForgotPassword ? 'New password' : 'Password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {(isRegistering || isForgotPassword) && (
          <TextInput
            style={styles.input}
            placeholder={isForgotPassword ? 'Confirm new password' : 'Confirm password'}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />
        )}

        {isForgotPassword && (
          <View style={styles.otpBox}>
            <TextInput
              style={styles.otpInput}
              placeholder="Admin OTP"
              value={adminCode}
              onChangeText={setAdminCode}
              maxLength={6}
              keyboardType="number-pad"
              editable={!loading}
            />
            <View style={styles.otpActions}>
              <TouchableOpacity style={[styles.otpButton, adminCodeVerified && styles.otpVerified]} onPress={verifyAdminCode} disabled={loading}>
                <Text style={styles.otpButtonText}>{adminCodeVerified ? 'Verified' : 'Verify Admin OTP'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}
        {isRegistering && !!cameraError && <Text style={styles.message}>{cameraError}</Text>}
        {!!cameraTarget && (
          <View style={styles.cameraPanel}>
            <Text style={styles.documentLabel}>Camera: {cameraTarget.label}</Text>
            {React.createElement('video', {
              ref: videoRef,
              autoPlay: true,
              playsInline: true,
              muted: true,
              style: styles.cameraPreview,
            })}
            <View style={styles.documentActions}>
              <TouchableOpacity style={styles.documentButton} onPress={snapAgentPhoto}>
                <Text style={styles.documentButtonText}>📷 Snap Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentButtonAlt} onPress={closeCamera}>
                <Text style={styles.documentButtonAltText}>📷 Close Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={isRegistering ? handleRegister : isForgotPassword ? handleResetPassword : handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Please wait...' : isRegistering ? 'Create account' : isForgotPassword ? 'Reset Password' : 'Sign in'}</Text>
        </TouchableOpacity>

        {!isRegistering && !isForgotPassword && (
          <TouchableOpacity style={styles.switchButton} onPress={openForgotPassword} disabled={loading}>
            <Text style={styles.switchText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.switchButton} onPress={isForgotPassword ? () => setMode('login') : switchMode} disabled={loading}>
          <Text style={styles.switchText}>
            {isForgotPassword ? 'Back to sign in' : isRegistering ? 'Already have an account? Sign in' : 'New agent? Register here'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: dark ? '#0f1720' : '#f7f8fb',
      paddingHorizontal: 20,
    },
    loginCard: {
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 14,
      padding: 28,
      width: '100%',
      maxWidth: 420,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 7,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 10,
      color: dark ? '#f7fafc' : '#0f5fff',
      fontFamily: 'Georgia',
    },
    subtitle: {
      color: dark ? '#cbd5e1' : '#627083',
      marginBottom: 24,
      lineHeight: 22,
      fontFamily: 'Georgia',
    },
    input: {
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 15,
      backgroundColor: dark ? '#030814' : '#f8fafc',
      color: dark ? '#f8fafc' : '#0f1720',
      fontFamily: 'Georgia',
    },
    documentField: {
      marginBottom: 16,
    },
    documentLabel: {
      color: dark ? '#f8fafc' : '#0f1720',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
      marginBottom: 6,
    },
    documentBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: dark ? '#334155' : '#b7c9e8',
      borderRadius: 12,
      backgroundColor: dark ? '#030814' : '#f8fafc',
      padding: 12,
      gap: 10,
    },
    documentPreview: {
      width: '100%',
      height: 150,
      borderRadius: 10,
      objectFit: 'cover',
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
    },
    documentPlaceholder: {
      color: dark ? '#cbd5e1' : '#627083',
      fontSize: 12,
      fontFamily: 'Georgia',
      lineHeight: 18,
    },
    documentActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    documentButton: {
      backgroundColor: '#0f5fff',
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    documentButtonAlt: {
      backgroundColor: dark ? '#223044' : '#edf3ff',
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
    },
    documentButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    documentButtonAltText: {
      color: dark ? '#f8fafc' : '#0f5fff',
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    cameraPanel: {
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#b7c9e8',
      borderRadius: 12,
      backgroundColor: dark ? '#030814' : '#f8fafc',
      padding: 12,
      gap: 10,
      marginBottom: 14,
    },
    cameraPreview: {
      width: '100%',
      maxHeight: 260,
      borderRadius: 10,
      backgroundColor: '#000000',
    },
    button: {
      backgroundColor: '#0f5fff',
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Georgia',
    },
    switchButton: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 6,
    },
    switchText: {
      color: dark ? '#8fff55' : '#0f5fff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Georgia',
    },
    message: {
      color: '#b42318',
      fontSize: 13,
      marginBottom: 12,
      fontFamily: 'Georgia',
    },
    otpBox: {
      marginBottom: 14,
    },
    otpInput: {
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      backgroundColor: dark ? '#030814' : '#f8fafc',
      color: dark ? '#f8fafc' : '#0f1720',
      fontFamily: 'Georgia',
      marginBottom: 10,
    },
    otpActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    otpButton: {
      backgroundColor: dark ? '#223044' : '#edf3ff',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    otpVerified: {
      backgroundColor: '#0f5fff',
    },
    otpButtonText: {
      color: dark ? '#f3f6fb' : '#0f5fff',
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Georgia',
    },
  });
};
