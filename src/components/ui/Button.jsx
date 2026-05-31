import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors.js';
import { Text } from './Text.jsx';

export function Button({ children, onPress, variant = 'primary', icon: Icon, style }) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style
      ]}
    >
      {Icon && <Icon size={17} color={isPrimary ? '#ffffff' : colors.primary} />}
      <Text style={[styles.label, { color: isPrimary ? '#ffffff' : colors.primary }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  secondary: {
    backgroundColor: 'var(--app-surface)',
    borderColor: 'var(--app-border)'
  },
  label: {
    fontSize: 14,
    fontWeight: '500'
  },
  pressed: {
    opacity: 0.82
  }
});
