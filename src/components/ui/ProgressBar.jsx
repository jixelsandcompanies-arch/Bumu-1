import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors.js';

export function ProgressBar({ value }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(value, 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary
  }
});
