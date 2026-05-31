import React, { useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { colors } from '../theme/colors.js';
import { authService } from '../services/authService.js';

export function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState('finance@bumupaygo.co.ke');
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

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Finance email</Text>
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button icon={LogIn} onPress={handleLogin} style={styles.fullButton}>
            Sign in
          </Button>
        </View>
      </View>
    </ScrollView>
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
  fullButton: {
    width: '100%'
  }
});
